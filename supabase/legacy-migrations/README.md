# Legacy foundation migrations

These SQL files are retained as historical source material, but are intentionally outside `supabase/migrations/` so the Supabase CLI cannot try to replay them against the already-provisioned production database.

Before migration history was consistently tracked, these foundation changes were applied directly or through the managed migration interface. A live-schema audit confirmed the resulting objects are present: the artist profile, collector metadata, product variants and wearable product type, checkout/quote/payment structures, dual-currency fields, inventory reservations, and the hardened payment-completion function.

Do not move these files back into the active migrations directory or run them on the current project. For a new environment, create and review a clean baseline/schema dump rather than replaying this historical sequence as-is; several functions were superseded by later versions.

Archived files:
- `20261102000000_artist_profile.sql`
- `20261103000000_product_collector_details.sql`
- `20261106000000_product_variants.sql`
- `20261107000000_wearable_product_type.sql`
- `20261107010000_repair_product_collector_columns.sql`
- `20261113000000_checkout_order_intake.sql`
- `20261114000000_order_quotes_and_notifications.sql`
- `20261115000000_flutterwave_payment_foundation.sql`
- `20261116000000_validate_public_order_payload.sql`
- `20261117000000_dual_currency_and_stock_reservations.sql`
- `20261118000000_currency_checkout_and_inventory_reservations.sql`
- `20261119000000_idempotent_payment_notifications.sql`
- `20261120000000_require_all_payment_holds_valid.sql`
