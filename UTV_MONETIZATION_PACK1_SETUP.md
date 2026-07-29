# UTV Monetization Pack 1

Routes added:
- /upgrade
- /boost
- /api/billing/checkout
- /api/billing/portal
- /api/billing/webhook

Supabase SQL:
- supabase/utv-monetization-pack1.sql

Required Vercel server variables:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY

Required Stripe Price IDs in Vercel:
- STRIPE_PRICE_CREATOR_PLUS
- STRIPE_PRICE_PRO
- STRIPE_PRICE_BUSINESS
- STRIPE_PRICE_BOOST_LOCAL
- STRIPE_PRICE_BOOST_REACH
- STRIPE_PRICE_BOOST_WORLD
- STRIPE_PRICE_BOOST_FEATURE

Optional:
- NEXT_PUBLIC_SITE_URL

Important:
Never put STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, or
SUPABASE_SERVICE_ROLE_KEY in client-side code or NEXT_PUBLIC_ variables.
