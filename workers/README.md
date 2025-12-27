# Membership Workers

Cloudflare Workers for the tamm.in membership system.

## Architecture

```
┌─────────────┐    Webhook     ┌────────────────────┐
│   Ko-fi     │ ────────────►  │                    │
│  Payment    │                │   tamm-api         │
└─────────────┘                │   (combined)       │
                               │                    │
┌─────────────┐   Magic Link   │  POST /webhook     │
│  User       │ ◄──────────────│  GET  /login       │
│  Browser    │                │  POST /login       │
└─────────────┘                │  GET  /auth/*      │
       │                       │  GET  /logout      │
       │ Visits content        │  GET  /content/*   │
       ▼                       └────────────────────┘
┌─────────────┐                        │
│  iframe     │                        ▼
│  embed      │                ┌────────────────────┐
└─────────────┘                │ Supabase: members  │
                               │ email, expires_at  │
                               └────────────────────┘
```

## Setup

### 1. Supabase Project

1. Create project at [supabase.com](https://supabase.com)
2. Run this SQL in the SQL Editor:

```sql
create table members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  ko_fi_transaction_id text,
  ko_fi_name text,
  tier text default 'member',
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index idx_members_email_expires on members(email, expires_at);
```

3. Enable magic link auth: Authentication → Providers → Email → Enable "Confirm email"
4. Note your keys from Settings → API:
   - Project URL (e.g., `https://xyz.supabase.co`)
   - `anon` key (public)
   - `service_role` key (secret)

### 2. Ko-fi Webhook

1. Go to [ko-fi.com/manage/webhooks](https://ko-fi.com/manage/webhooks)
2. Set webhook URL to `https://api.tamm.in/webhook`
3. Copy the verification token

### 3. Deploy the API Worker

```bash
cd workers/api
npm install
```

Update `wrangler.toml` with your Supabase URL:
```toml
[vars]
SUPABASE_URL = "https://your-project.supabase.co"
```

Set secrets:
```bash
wrangler secret put KOFI_VERIFICATION_TOKEN
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Deploy:
```bash
npm run deploy
```

### 4. Configure Custom Domain

In Cloudflare Dashboard:

1. Go to Workers & Pages → tamm-api
2. Settings → Triggers → Custom Domains
3. Add `api.tamm.in`

## Usage

### Embed Protected Content

```astro
---
import ProtectedContent from '@/components/ProtectedContent.astro';
---

<ProtectedContent slug="the-ui-is-dead" title="The UI is Dead" height="800px" />
```

### Full Page Paywall

```astro
---
import MemberPaywall from '@/components/MemberPaywall.astro';
---

<!-- Show teaser content -->
<p>This is a preview of the member-only content...</p>

<MemberPaywall
  title="Full presentation"
  description="Subscribe to access the complete slides and video recording."
/>
```

### Add New Protected Content

Edit `workers/content/src/index.ts`:

```ts
const PROTECTED_CONTENT: Record<string, () => string> = {
  'the-ui-is-dead': () => getUIIsDeadContent(),
  'my-new-content': () => getMyNewContent(),  // Add here
};

function getMyNewContent(): string {
  return `<!DOCTYPE html>...`;
}
```

## Testing

1. Subscribe to yourself on Ko-fi (Ko-fi allows self-subscription for testing)
2. Check Supabase → Table Editor → members for your email
3. Visit a protected content page
4. Click login, enter your email
5. Check email for magic link
6. Click link → should now see full content

## Membership Expiration

- Each Ko-fi payment sets `expires_at = NOW() + 30 days`
- Recurring payments auto-refresh expiry
- Content worker checks `expires_at > NOW()` before serving
- No cancellation webhook from Ko-fi, so we rely on expiry dates
