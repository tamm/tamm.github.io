/**
 * Combined API Worker for tamm.in membership system
 *
 * Routes:
 * - POST /webhook       - Ko-fi payment webhook
 * - GET  /login         - Login page
 * - POST /login         - Send magic link
 * - GET  /auth/callback - Handle magic link redirect
 * - GET  /auth/status   - Check auth status
 * - GET  /logout        - Clear session
 * - GET  /content/:slug - Protected content
 */

interface Env {
  KOFI_VERIFICATION_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SITE_URL: string;
}

const COOKIE_NAME = 'tamm_session';
const COOKIE_OPTIONS = 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': env.SITE_URL,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Ko-fi webhook
      if (path === '/webhook' && request.method === 'POST') {
        return handleKofiWebhook(request, env);
      }

      // Auth routes
      if (path === '/login' && request.method === 'GET') {
        return handleLoginPage(request, env, corsHeaders);
      }
      if (path === '/login' && request.method === 'POST') {
        return handleLoginSubmit(request, env, corsHeaders);
      }
      if (path === '/auth/callback') {
        return handleCallback(request, env, corsHeaders);
      }
      if (path === '/auth/status') {
        return handleStatus(request, env, corsHeaders);
      }
      if (path === '/logout') {
        return handleLogout(env, corsHeaders);
      }

      // Protected content
      const contentMatch = path.match(/^\/content\/([a-z0-9-]+)$/);
      if (contentMatch) {
        return handleContent(request, contentMatch[1], env, corsHeaders);
      }

      // Handle root path - might have auth hash fragment
      if (path === '/' || path === '') {
        return handleCallback(request, env, corsHeaders);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('API error:', error);
      return new Response('Internal error', { status: 500, headers: corsHeaders });
    }
  },
};

// ============================================
// KO-FI WEBHOOK
// ============================================

interface KofiPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: 'Donation' | 'Subscription' | 'Shop Order' | 'Commission';
  is_public: boolean;
  from_name: string;
  message: string;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  tier_name: string | null;
}

async function handleKofiWebhook(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const dataString = formData.get('data');

  if (!dataString || typeof dataString !== 'string') {
    return new Response('Missing data field', { status: 400 });
  }

  const payload: KofiPayload = JSON.parse(dataString);

  if (payload.verification_token !== env.KOFI_VERIFICATION_TOKEN) {
    console.error('Invalid verification token');
    return new Response('Unauthorized', { status: 401 });
  }

  // Only process subscription payments
  if (!payload.is_subscription_payment && payload.type !== 'Subscription') {
    console.log('Ignoring non-subscription payment:', payload.type);
    return new Response('OK - ignored', { status: 200 });
  }

  // Calculate expiry (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Upsert member
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      email: payload.email.toLowerCase(),
      ko_fi_transaction_id: payload.kofi_transaction_id,
      ko_fi_name: payload.from_name,
      tier: payload.tier_name || 'member',
      expires_at: expiresAt.toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Supabase error:', error);
    return new Response('Database error', { status: 500 });
  }

  console.log(`Member upserted: ${payload.email}, expires: ${expiresAt.toISOString()}`);
  return new Response('OK', { status: 200 });
}

// ============================================
// AUTH
// ============================================

function handleLoginPage(request: Request, env: Env, corsHeaders: Record<string, string>): Response {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member Login - tamm.in</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      width: 100%;
      background: #2a2a2a;
      border-radius: 12px;
      padding: 40px;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #f48031; }
    p { color: #888; margin-bottom: 24px; }
    label { display: block; margin-bottom: 8px; font-size: 14px; }
    input[type="email"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #333;
      color: #fff;
      font-size: 16px;
      margin-bottom: 16px;
    }
    input[type="email"]:focus { outline: none; border-color: #f48031; }
    button {
      width: 100%;
      padding: 12px;
      background: #f48031;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #e07020; }
    button:disabled { background: #666; cursor: not-allowed; }
    .success { background: #1a3a1a; border: 1px solid #2a5a2a; padding: 16px; border-radius: 8px; margin-top: 16px; }
    .error { background: #3a1a1a; border: 1px solid #5a2a2a; padding: 16px; border-radius: 8px; margin-top: 16px; }
    .back-link { display: block; text-align: center; margin-top: 24px; color: #888; text-decoration: none; }
    .back-link:hover { color: #f48031; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Member Login</h1>
    <p>Enter your email to receive a magic link.</p>
    <form id="login-form">
      <label for="email">Email address</label>
      <input type="email" id="email" name="email" required placeholder="you@example.com">
      <button type="submit" id="submit-btn">Send Magic Link</button>
    </form>
    <div id="message"></div>
    <a href="${env.SITE_URL}" class="back-link">Back to tamm.in</a>
  </div>
  <script>
    const form = document.getElementById('login-form');
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('message');
    const redirect = '${redirect}';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Sending...';
      msg.innerHTML = '';
      const email = document.getElementById('email').value;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, redirect }),
        });
        const data = await res.json();
        if (res.ok) {
          msg.innerHTML = '<div class="success">Check your email for the magic link!</div>';
          form.style.display = 'none';
        } else {
          msg.innerHTML = '<div class="error">' + (data.error || 'Something went wrong') + '</div>';
          btn.disabled = false;
          btn.textContent = 'Send Magic Link';
        }
      } catch (err) {
        msg.innerHTML = '<div class="error">Network error. Please try again.</div>';
        btn.disabled = false;
        btn.textContent = 'Send Magic Link';
      }
    });
  </script>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
}

async function handleLoginSubmit(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { email, redirect } = (await request.json()) as { email: string; redirect?: string };

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Check active membership
  const memberCheck = await fetch(
    `${env.SUPABASE_URL}/rest/v1/members?email=eq.${encodeURIComponent(email.toLowerCase())}&expires_at=gt.${new Date().toISOString()}&select=email`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const members = (await memberCheck.json()) as Array<{ email: string }>;

  if (!members || members.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          'No active membership found for this email. Subscribe at ko-fi.com/tigresstamm to access member content.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Send magic link
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Supabase OTP error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send magic link' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Set redirect cookie if provided
  const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders });
  if (redirect) {
    headers.set('Set-Cookie', `tamm_redirect=${encodeURIComponent(redirect)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  }

  return new Response(JSON.stringify({ success: true }), { headers });
}

async function handleCallback(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get('access_token');

  // Handle hash fragment extraction
  if (!accessToken) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Completing login...</title></head>
<body><p>Completing login...</p>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (accessToken) {
    window.location.href = '/auth/callback?access_token=' + accessToken;
  } else {
    document.body.innerHTML = '<p>Login failed. <a href="/login">Try again</a></p>';
  }
</script></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html', ...corsHeaders } });
  }

  // Verify token
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!userResponse.ok) {
    return new Response('Invalid token', { status: 401, headers: corsHeaders });
  }

  // Check for redirect cookie
  const cookie = request.headers.get('Cookie');
  const redirectMatch = cookie?.match(/tamm_redirect=([^;]+)/);
  const redirectPath = redirectMatch ? decodeURIComponent(redirectMatch[1]) : null;

  // Build redirect URL - use SITE_URL (tamm.in) as base, not api.tamm.in
  const redirectUrl = redirectPath
    ? `${env.SITE_URL}${redirectPath}`
    : env.SITE_URL;

  const headers = new Headers(corsHeaders);
  headers.set('Set-Cookie', `${COOKIE_NAME}=${accessToken}; ${COOKIE_OPTIONS}`);
  // Clear the redirect cookie
  headers.append('Set-Cookie', 'tamm_redirect=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.set('Location', redirectUrl);

  return new Response(null, { status: 302, headers });
}

function handleLogout(env: Env, corsHeaders: Record<string, string>): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  headers.set('Location', env.SITE_URL);
  return new Response(null, { status: 302, headers });
}

async function handleStatus(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const cookie = request.headers.get('Cookie');
  const token = cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!userResponse.ok) {
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const user = (await userResponse.json()) as { email: string };

  const memberCheck = await fetch(
    `${env.SUPABASE_URL}/rest/v1/members?email=eq.${encodeURIComponent(user.email)}&expires_at=gt.${new Date().toISOString()}&select=email,tier,expires_at`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const members = (await memberCheck.json()) as Array<{
    email: string;
    tier: string;
    expires_at: string;
  }>;
  const member = members?.[0];

  return new Response(
    JSON.stringify({
      authenticated: true,
      email: user.email,
      isMember: !!member,
      tier: member?.tier || null,
      expiresAt: member?.expires_at || null,
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

// ============================================
// PROTECTED CONTENT
// ============================================

const PROTECTED_CONTENT: Record<string, ContentConfig> = {
  'the-playlist-we-couldnt-keep': {
    title: 'The Playlist We Couldn\'t Keep',
    teaser: 'The Playlist We Couldn\'t Keep is Tamm\'s debut novel.',
    content: () => getPlaylistContent(),
  },
};

interface ContentConfig {
  title: string;
  teaser: string;
  content: () => string;
}

async function handleContent(
  request: Request,
  slug: string,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const contentConfig = PROTECTED_CONTENT[slug];

  if (!contentConfig) {
    return new Response('Content not found', { status: 404, headers: corsHeaders });
  }

  const cookie = request.headers.get('Cookie');
  const token = cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];

  if (!token) {
    return showPaywall(slug, contentConfig, env, corsHeaders);
  }

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!userResponse.ok) {
    return showPaywall(slug, contentConfig, env, corsHeaders);
  }

  const user = (await userResponse.json()) as { email: string };

  const memberCheck = await fetch(
    `${env.SUPABASE_URL}/rest/v1/members?email=eq.${encodeURIComponent(user.email)}&expires_at=gt.${new Date().toISOString()}&select=email`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const members = (await memberCheck.json()) as Array<{ email: string }>;

  if (!members || members.length === 0) {
    return showPaywall(slug, contentConfig, env, corsHeaders, user.email);
  }

  const content = contentConfig.content();
  return new Response(content, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': `ALLOW-FROM ${env.SITE_URL}`,
      'Content-Security-Policy': `frame-ancestors ${env.SITE_URL}`,
      ...corsHeaders,
    },
  });
}

function showPaywall(
  slug: string,
  contentConfig: ContentConfig,
  env: Env,
  corsHeaders: Record<string, string>,
  email?: string
): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contentConfig.title} - Member Content</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .paywall { text-align: center; max-width: 400px; }
    .lock-icon { font-size: 48px; margin-bottom: 16px; }
    h2 { font-size: 20px; margin-bottom: 8px; }
    .teaser { color: #ccc; margin-bottom: 16px; line-height: 1.5; font-style: italic; }
    p { color: #888; margin-bottom: 24px; line-height: 1.5; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #f48031;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 8px;
    }
    .btn:hover { background: #e07020; }
    .btn-secondary { background: #333; border: 1px solid #444; }
    .btn-secondary:hover { background: #444; }
    .expired {
      background: #3a2a1a;
      border: 1px solid #5a4a3a;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="paywall">
    <div class="lock-icon">🔒</div>
    <h2>${contentConfig.title}</h2>
    <p class="teaser">${contentConfig.teaser}</p>
    ${email ? `<div class="expired">Your membership for ${email} has expired or is inactive.</div>` : ''}
    <p>This content is exclusive to supporters. Join to unlock full access.</p>
    <a href="https://ko-fi.com/tigresstamm/tiers" class="btn" target="_top">Subscribe on Ko-fi</a>
    <br>
    <a href="/login?redirect=/content/${slug}" class="btn btn-secondary" target="_top">
      ${email ? 'Login with different email' : 'Already a member? Login'}
    </a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 401,
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': `ALLOW-FROM ${env.SITE_URL}`,
      'Content-Security-Policy': `frame-ancestors ${env.SITE_URL}`,
      ...corsHeaders,
    },
  });
}

// ============================================
// PROTECTED CONTENT DEFINITIONS
// Add new content functions here
// ============================================

function getPlaylistContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Playlist We Couldn't Keep</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #0a0a0a;
      color: #e0e0e0;
      line-height: 1.8;
      padding: 40px 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #fff;
      font-weight: normal;
      font-style: italic;
    }
    .subtitle {
      color: #f48031;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 40px;
    }
    .section {
      background: #1a1a1a;
      border-left: 3px solid #f48031;
      padding: 24px 32px;
      margin-bottom: 32px;
    }
    .bio {
      font-size: 16px;
      color: #ccc;
    }
    .bio p { margin-bottom: 16px; }
    .colophon {
      font-size: 14px;
      color: #888;
      border-top: 1px solid #333;
      padding-top: 24px;
      margin-top: 40px;
    }
    .thank-you {
      text-align: center;
      padding: 32px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border-radius: 8px;
      margin-top: 40px;
    }
    .thank-you p {
      color: #f48031;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>The Playlist We Couldn't Keep</h1>
    <div class="subtitle">A Novel by Tamm Sjodin</div>

    <div class="section bio">
      <p><strong>Tamm Sjodin</strong> is a queer, nonbinary writer based in Sydney, Australia.</p>

      <p>When not writing contemporary romance novels based on their chaotic dating history, they can be found running through Centennial Park, making playlists for people they probably shouldn't be making playlists for, and advocating for LGBTQIA+ inclusion in the workplace.</p>

      <p><em>The Playlist We Couldn't Keep</em> is their debut novel.</p>
    </div>

    <div class="colophon">
      <p>This book was written with the assistance of Claude, an AI by Anthropic. Tamm provided the real experiences, emotional chaos, and strong opinions about playlists. Claude helped turn it all into sentences, kept track of the timeline, and only occasionally suggested cutting the parts where Tamm got too self-indulgent.</p>
      <p style="margin-top: 12px;">Any remaining melodrama is entirely Tamm's fault.</p>
    </div>

    <div class="thank-you">
      <p>Thank you for being a supporter.</p>
    </div>
  </div>
</body>
</html>`;
}
