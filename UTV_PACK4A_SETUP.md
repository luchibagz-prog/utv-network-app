# UTV Launch Pack 4A — Notification Foundation

## 1. Run SQL
Copy all of `supabase/utv-launch-pack4a-notifications.sql` into Supabase SQL Editor and click Run.

## 2. Create VAPID keys
Run:

```bash
npx web-push generate-vapid-keys
```

## 3. Add these Vercel environment variables

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (example: `mailto:your-email@example.com`)
- `SUPABASE_SERVICE_ROLE_KEY` (already used by your monetization server routes)

Never expose `VAPID_PRIVATE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_` variables.

## 4. Deploy, then test
Open installed UTV, tap **Turn on UTV alerts**, and allow notifications.

Pack 4A installs the subscription system, service worker, in-app realtime alerts, and a server test endpoint. Pack 4B will connect every UTV event type to automatic closed-app delivery.
