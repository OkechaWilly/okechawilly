# Supabase setup — Okecha Willy

This project uses Supabase for Postgres, admin authentication and image storage. The public website remains on Next.js/Vercel.

## 1. Create the Supabase project

1. Create a new project in the Supabase dashboard.
2. Choose a strong database password and keep it private.
3. Wait for the database to finish provisioning.
4. Open **SQL Editor**, create a query, paste the complete contents of `supabase/schema.sql`, and run it.

## 2. Create the first admin account

1. In Supabase, open **Authentication → Users**.
2. Add your own email address as a user. Use an address you control.
3. Confirm the user if the dashboard offers that option.
4. Copy the user's UUID.
5. Open **SQL Editor** and run this statement, replacing the UUID and display name:

```sql
insert into public.profiles (id, display_name, role)
values ('YOUR-AUTH-USER-UUID', 'Okecha Willy', 'admin')
on conflict (id) do update
set display_name = excluded.display_name, role = 'admin';
```

Do not enable public sign-ups for the admin area. Create admin accounts manually.

## 3. Add environment variables

In the Supabase dashboard, open **Project Settings → API** (or **Data API**) and copy the Project URL and publishable/anon key.

Add these to the Vercel project under **Settings → Environment Variables** for Production, Preview and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

The publishable/anon key is designed for browser use with Row Level Security enabled. Never put the Supabase service-role key in a `NEXT_PUBLIC_*` variable or commit secrets to GitHub.

## 4. Data model

- **Artworks**: portfolio entries, dimensions, medium, year, status and publication state.
- **Collections**: curated groups of artworks.
- **Artwork images**: multiple images per artwork, including a primary image.
- **Products**: originals, limited-edition prints, open-edition prints, merchandise and art objects.
- **Product images**: product gallery images.
- **Orders and order items**: customer and item snapshots, payment and fulfilment statuses.
- **Inquiries**: collector enquiries and their follow-up status.
- **Journal posts**: drafts and published studio writing.
- **Profiles**: admin/customer roles.

## Security notes

- Row Level Security is enabled on every application table.
- Public users can read only published catalogue content.
- Only users with a `profiles.role = 'admin'` record can manage catalogue, uploads, orders and enquiries.
- The first admin must be inserted manually as described above.
- Checkout and payment processing are intentionally not enabled yet. Payment provider selection will be made after verifying Uganda business onboarding and settlement support.
