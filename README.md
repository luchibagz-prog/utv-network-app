# UTV MVP Starter

A fast first version of UTV: streaming homepage, creator upload submissions, admin approval, free upload window, and Stripe payment route.

## Stack
- Next.js App Router
- Supabase Auth + Database + Storage
- Stripe Checkout

## What this MVP does
- Public UTV homepage
- Watch page for approved shows
- Creator dashboard
- Upload/submit show, podcast, movie, trailer, music video
- First-week free upload logic
- Paid creator submission logic after launch week
- Admin page to approve or reject submissions

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create a Supabase project, run `supabase/schema.sql`, then add your keys to `.env.local`.

## Suggested launch rule
Set `NEXT_PUBLIC_FREE_UPLOAD_END_DATE` to 7 days after public launch.
Creators can submit free before that date. After that, send them to Stripe Checkout.

## Important
This is an MVP starter, not a finished Netflix-scale platform. Start here, launch, then upgrade.
