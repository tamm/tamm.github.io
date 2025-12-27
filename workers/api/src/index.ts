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

// Logo SVG from @tamm/styles
const LOGO_SVG = `<svg viewBox="0 0 553.33331 189.33333" xmlns="http://www.w3.org/2000/svg" aria-label="Tamm logo" class="logo-svg"><g transform="matrix(1.3333333,0,0,-1.3333333,0,189.33333)"><g clip-path="url(#logoClip)"><g transform="translate(145.0054,114.2412)"><path d="m 0,0 c -0.213,-0.08 -0.711,-0.174 -1.485,-0.284 -3.559,-0.527 -7.272,-1.507 -11.145,-2.947 -4.228,-1.574 -28.623,-4.556 -40.754,-10.385 -0.72,-27.824 1.472,-45.233 8.821,-63.908 1.147,-2.923 1.764,-4.698 1.846,-5.328 0.546,-2.42 0.026,-3.938 -1.539,-4.55 -1.632,-0.647 -2.807,-0.697 -3.512,-0.154 -0.226,0.16 -1.347,2.799 -3.365,7.923 -7.668,19.501 -9.097,35.263 -8.798,64.098 -30.886,-10.403 -51.273,-30.388 -55.382,-32.757 -1.656,-0.952 -3.02,-0.504 -4.087,1.352 -0.954,1.66 -0.664,3.063 0.879,4.214 2.007,1.423 4.965,3.569 8.871,6.438 5.734,4.449 22.517,18.813 53.513,28.758 C -25.141,2.413 -19.32,1.255 -13.73,3.337 -4.837,6.645 0.125,6.903 1.167,4.105 1.966,1.958 1.578,0.586 0,0" fill="#f48031"/></g><g transform="translate(163.1768,28.917)"><path d="m 0,0 c -2.524,0 -4.972,0.746 -7.343,2.238 -2.371,1.491 -4.169,3.307 -5.393,5.449 -1.835,-3.595 -4.513,-6.407 -8.031,-8.433 -3.518,-2.026 -7.304,-3.039 -11.358,-3.039 -5.89,0 -10.402,1.951 -13.539,5.85 -2.831,3.596 -4.245,8.414 -4.245,14.457 0,6.578 1.99,12.066 5.967,16.464 3.976,4.398 9.178,6.597 15.602,6.597 6.196,0 11.971,-1.798 17.326,-5.392 1.3,-0.919 1.949,-1.722 1.949,-2.41 0,-0.688 -0.363,-1.531 -1.086,-2.524 -0.723,-0.994 -1.43,-1.492 -2.116,-1.492 -0.459,0 -2.384,0.88 -5.775,2.638 -3.391,1.759 -6.536,2.641 -9.434,2.641 -4.803,0 -8.653,-1.511 -11.546,-4.533 -2.899,-3.021 -4.346,-6.979 -4.346,-11.874 0,-3.901 0.8,-7.115 2.401,-9.637 1.833,-2.983 4.616,-4.476 8.356,-4.476 4.957,0 8.886,1.607 11.79,4.819 2.212,2.524 3.773,6.808 4.692,12.85 0.228,1.76 1.219,2.639 2.972,2.639 1.983,0 3.397,-1.72 4.236,-5.163 1.067,-4.437 1.908,-7.036 2.519,-7.802 0.84,-1.071 2.746,-2.065 5.723,-2.983 C 1.608,6.196 2.753,5.125 2.753,3.672 2.753,1.225 1.835,0 0,0" fill="#f48031"/></g><g transform="translate(235.5654,64.8799)"><path d="m 0,0 c -2.906,-0.256 -6.304,-5.253 -11.81,-14.508 -3.212,-5.659 -6.462,-11.357 -9.752,-17.094 -0.613,-0.996 -1.341,-1.492 -2.182,-1.492 -2.599,0 -3.9,0.996 -3.9,2.993 0,1.227 0.421,3.857 1.262,7.883 0.841,4.032 1.262,7.197 1.262,9.499 0,9.134 -2.945,13.7 -8.835,13.7 -3.9,0 -7.686,-1.874 -11.358,-5.623 -2.907,-2.983 -5.24,-6.616 -6.999,-10.899 -1.606,-3.824 -2.408,-8.069 -2.408,-12.734 0,-1.224 0.17,-2.907 0.515,-5.049 0.346,-2.141 0.517,-3.633 0.517,-4.473 0,-1.99 -1.262,-2.984 -3.787,-2.984 -1.453,0 -2.408,0.914 -2.867,2.747 -0.153,1.446 -0.346,2.935 -0.574,4.462 -0.841,5.185 -2.104,12.966 -3.785,23.341 -0.69,4.803 -1.032,7.78 -1.032,8.924 0,1.448 1.146,2.174 3.44,2.174 1.53,0 2.524,-0.957 2.983,-2.87 0.154,-0.687 0.65,-3.938 1.493,-9.75 2.294,5.124 5.505,9.483 9.635,13.079 4.744,4.131 9.676,6.195 14.802,6.195 5.2,0 9.101,-2.295 11.701,-6.885 1.988,-3.746 2.984,-8.45 2.984,-14.112 8.11,13.617 12.883,20.422 19.044,20.422 1.914,0 3.518,-1.108 4.82,-3.326 C 6.238,1.785 0.534,0.046 0,0" fill="#f48031"/></g><g transform="translate(270.0791,47.6748)"><path d="m 0,0 c 1.268,6.361 -0.198,12.615 -0.504,13.704 -0.303,1.089 -1.001,2.194 -1.535,2.194 -1.987,0 -5.734,-4.626 -11.245,-13.88 -3.212,-5.662 -7.588,-15.211 -10.878,-20.948 -0.612,-0.994 -1.341,-1.492 -2.182,-1.492 -2.599,0 -3.897,0.996 -3.897,2.99 0,1.231 0.418,3.857 1.259,7.886 0.84,4.031 2.393,11.051 2.393,13.351 0,9.134 -2.622,14.012 -8.792,13.4 -3.88,-0.386 -3.906,6.946 1.216,6.946 5.204,0 8.416,-2.399 11.017,-6.989 1.987,-3.749 2.388,-6.366 2.388,-12.025 8.106,13.614 15.052,18.336 19.639,18.336 1.915,0 3.518,-1.111 4.82,-3.329 1.07,-1.835 1.605,-3.748 1.605,-5.737 0,-1.912 -0.38,-4.838 -1.148,-8.776 C 3.394,1.692 -0.862,-4.342 0,0" fill="#f48031"/></g><g transform="translate(388.6006,99.1011)"><path d="m 0,0 c 0.763,-0.073 1.573,-0.422 2.436,-1.039 0.862,-0.616 1.129,-2.022 0.867,-2.651 -1.48,-3.534 -7.537,-11.097 -17.864,-21.257 -5.773,-5.68 -11.589,-11.99 -19.583,-18.867 -12.839,-11.056 -17.453,-14.148 -22.515,-17.74 -7.86,-5.572 -13.051,-8.516 -14.603,-9.126 -2.756,-1.077 -9.214,-1.582 -11.645,-0.802 -8.361,2.683 -11.897,9.592 -11.897,17.469 0,2.218 0.384,5.508 1.148,9.867 0.767,4.359 1.146,7.534 1.146,9.521 0,1.073 -0.266,1.607 -0.802,1.607 -1.987,0 -5.734,-4.626 -11.244,-13.881 -3.213,-5.661 -6.464,-11.359 -9.753,-17.096 -0.608,-0.994 -1.337,-1.491 -2.177,-1.491 -2.6,0 -3.903,0.998 -3.903,2.991 0,1.23 0.423,3.858 1.264,7.887 0.841,4.031 1.264,7.195 1.264,9.496 0,9.134 0.84,17.946 3.44,13.358 1.987,-3.749 2.983,-8.454 2.983,-14.113 8.106,13.615 14.458,20.422 19.044,20.422 1.911,0 3.519,-1.107 4.821,-3.326 1.069,-1.837 1.604,-3.749 1.604,-5.736 0,-1.913 -0.384,-4.838 -1.147,-8.779 -0.763,-3.939 -1.147,-6.978 -1.147,-9.121 0,-4.284 1.109,-7.571 3.328,-9.867 0.941,-0.882 2.403,-1.835 4.386,-2.852 0.09,-0.043 3.794,-1.115 7.856,0.303 7.446,2.594 23.101,14.693 33.552,23.66 7.761,6.658 14.384,12.44 19.787,18.255 9.976,10.735 16.379,19.336 16.521,19.582 C -1.544,-1.145 -1.065,0.104 0,0" fill="#f48031"/></g></g></g><defs><clipPath id="logoClip"><path d="M 0,142 H 415 V 0 H 0 Z"/></clipPath></defs></svg>`;

// CSS from @tamm/styles
const STYLES_CSS = `
:root {
  --color-brand-orange: #f48031;
  --color-brand-orange-hover: #e5722b;
  --color-brand-orange-light: rgba(244, 128, 49, 0.1);
  --color-brand-orange-underline: rgba(244, 128, 49, 0.3);
  --color-zinc-50: #fafafa;
  --color-zinc-100: #f4f4f5;
  --color-zinc-200: #e4e4e7;
  --color-zinc-300: #d4d4d8;
  --color-zinc-400: #a1a1aa;
  --color-zinc-500: #71717a;
  --color-zinc-600: #52525b;
  --color-zinc-700: #3f3f46;
  --color-zinc-800: #27272a;
  --color-zinc-900: #18181b;
  --color-bg: var(--color-zinc-50);
  --color-bg-elevated: #fff;
  --color-bg-input: #fff;
  --color-text: var(--color-zinc-900);
  --color-text-muted: var(--color-zinc-500);
  --color-border: var(--color-zinc-200);
  --color-border-input: var(--color-zinc-300);
  --color-success-bg: #dcfce7;
  --color-success-border: #86efac;
  --color-success-text: #166534;
  --color-error-bg: #fee2e2;
  --color-error-border: #fca5a5;
  --color-error-text: #991b1b;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radius-lg: 0.5rem;
  --radius-2xl: 1rem;
  --shadow-focus: 0 0 0 3px var(--color-brand-orange-light);
  --transition-fast: 0.15s ease;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-zinc-900);
    --color-bg-elevated: var(--color-zinc-800);
    --color-bg-input: var(--color-zinc-700);
    --color-text: var(--color-zinc-100);
    --color-text-muted: var(--color-zinc-400);
    --color-border: var(--color-zinc-700);
    --color-border-input: var(--color-zinc-600);
    --color-success-bg: #14532d;
    --color-success-border: #22c55e;
    --color-success-text: #dcfce7;
    --color-error-bg: #7f1d1d;
    --color-error-border: #ef4444;
    --color-error-text: #fee2e2;
  }
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.logo { margin-bottom: 32px; }
.logo a { display: block; text-decoration: none; }
.logo-svg { height: 48px; width: auto; }
.container {
  max-width: 400px;
  width: 100%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: 32px;
}
h1 { font-size: 24px; margin-bottom: 8px; color: var(--color-text); }
.subtext { color: var(--color-text-muted); margin-bottom: 24px; font-size: 15px; line-height: 1.5; }
label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; }
input[type="email"] {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-lg);
  background: var(--color-bg-input);
  color: var(--color-text);
  font-size: 16px;
  margin-bottom: 16px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input[type="email"]:focus { outline: none; border-color: var(--color-brand-orange); box-shadow: var(--shadow-focus); }
button {
  width: 100%;
  padding: 12px 16px;
  background: var(--color-brand-orange);
  color: #fff;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 16px;
  cursor: pointer;
  font-weight: 600;
  transition: background var(--transition-fast);
}
button:hover { background: var(--color-brand-orange-hover); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.success { background: var(--color-success-bg); border: 1px solid var(--color-success-border); color: var(--color-success-text); padding: 16px; border-radius: var(--radius-lg); margin-top: 16px; }
.error { background: var(--color-error-bg); border: 1px solid var(--color-error-border); color: var(--color-error-text); padding: 16px; border-radius: var(--radius-lg); margin-top: 16px; }
.footer-links { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--color-border); text-align: center; font-size: 14px; }
.footer-links p { color: var(--color-text-muted); margin-bottom: 8px; }
.footer-links a { color: var(--color-brand-orange); text-decoration: underline; text-decoration-color: var(--color-brand-orange-underline); }
.footer-links a:hover { text-decoration-color: var(--color-brand-orange); }
.back-link { display: block; text-align: center; margin-top: 24px; color: var(--color-text-muted); text-decoration: none; font-size: 14px; }
.back-link:hover { color: var(--color-brand-orange); }
`;

function handleLoginPage(request: Request, env: Env, corsHeaders: Record<string, string>): Response {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member Login - tamm.in</title>
  <style>${STYLES_CSS}</style>
</head>
<body>
  <div class="logo"><a href="${env.SITE_URL}">${LOGO_SVG}</a></div>
  <div class="container">
    <h1>Member Login</h1>
    <p class="subtext">Enter your email to receive a magic link. No password needed!</p>
    <form id="login-form">
      <label for="email">Email address</label>
      <input type="email" id="email" name="email" required placeholder="you@example.com" autocomplete="email">
      <button type="submit" id="submit-btn">Send Magic Link</button>
    </form>
    <div id="message"></div>
    <div class="footer-links">
      <p>Looking for something else?</p>
      <a href="https://ko-fi.com/tigresstamm/tiers" target="_blank" rel="noopener">Become a member</a>
      &nbsp;·&nbsp;
      <a href="${env.SITE_URL}/to/news">Newsletter signup</a>
    </div>
  </div>
  <a href="${env.SITE_URL}" class="back-link">&larr; Back to tamm.in</a>
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
          msg.innerHTML = '<div class="success">✓ Check your email for the magic link!</div>';
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
