# Supabase migration history

The SQL filenames in this directory are aligned to the versions recorded in the connected Supabase project's `supabase_migrations.schema_migrations` table. The original source filenames used different timestamps because the migrations were applied through the managed interface, which generated server-side versions.

The duplicate `restrict_legacy_public_order_rpc` entries are retained as two versioned files because the database contains two applied records with that name. The migration is a repeat-safe privilege revocation.

Keep this directory and the database migration ledger in sync. Add new changes as a newly timestamped migration, review it, apply it through the Supabase migration workflow, and verify the recorded version before deployment. Never replay archived foundation SQL against the existing project.
