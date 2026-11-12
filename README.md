# Okecha Willy — Artist Portfolio & Shop

A contemporary artist portfolio and direct-to-collector shop for Ugandan artist Okecha Willy.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide icons

## Getting started

```bash
npm install
npm run dev
```

The initial build uses temporary editorial reference photography. Replace image URLs in `src/data/site.ts` when original artwork photography is ready.

Preview deployments require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel Preview environment.


## Checkout preview setup

The checkout branch keeps payment separate from the live production site. Apply the migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/20261113000000_checkout_order_intake.sql`
2. `supabase/migrations/20261114000000_order_quotes_and_notifications.sql`
3. `supabase/migrations/20261115000000_flutterwave_payment_foundation.sql`

Vercel environment variables used by the order workflow:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for Supabase browser/server sessions.
- `RESEND_API_KEY` and `ORDER_EMAIL_FROM` — required to send order and quote emails. Use a verified sender domain in Resend.
- `ORDER_NOTIFICATION_EMAIL` — studio inbox for new orders, quote responses and verified payments.
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used in customer links (for example `https://okechawilly.vercel.app`).
- `FLW_SECRET_KEY` and `FLW_WEBHOOK_SECRET_HASH` — Flutterwave payment API and webhook verification.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key used to mark a payment paid after Flutterwave's transaction verification. Never prefix this key with `NEXT_PUBLIC_` or expose it to the browser.

Configure the Flutterwave webhook URL as `https://okechawilly.vercel.app/api/payments/flutterwave/webhook` after the merchant account is approved. Do not enable live checkout until the account, credentials, webhook, and end-to-end test payment are verified.
