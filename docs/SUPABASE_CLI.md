# Supabase CLI (migrations)

Remote project: **whipitflipitapp-dev** — ref `tpotdxasputlvppvpult`.

Migrations live in `supabase/migrations/`. Local CLI config: `supabase/config.toml` (`project_id = "WhipItFlipIt"`, Postgres major version **17**).

## One-time setup

1. **Log in** (Management API — not the DB password):

   ```powershell
   npx supabase login
   ```

2. **Link** (if `supabase/.temp/project-ref` is missing or wrong):

   ```powershell
   npx supabase link --project-ref tpotdxasputlvppvpult
   ```

   You may be prompted for the database password once; the CLI can also store it in the OS credential store.

3. **Database password** — add to `.env.local` (never commit):

   ```env
   SUPABASE_DB_PASSWORD=your-database-password-from-dashboard
   ```

   Copy the value from [Supabase Dashboard](https://supabase.com/dashboard) → Project **whipitflipitapp-dev** → **Project Settings** → **Database** → database password.

## Push migrations

The CLI does **not** load `.env.local` by itself. In PowerShell, export the password for the session, then push:

```powershell
$env:SUPABASE_DB_PASSWORD = "your-database-password-from-dashboard"
npm run db:push
```

Or set `$env:SUPABASE_DB_PASSWORD` from your `.env.local` line manually each session.

Dry run:

```powershell
npx supabase db push --dry-run --linked
```

## Login vs DB password

| Mechanism | Purpose |
| --- | --- |
| `supabase login` / access token | Management API: link project, list projects, some CLI operations |
| `SUPABASE_DB_PASSWORD` | Direct Postgres access for `db push`, `db pull`, etc. |

If `db push` fails with a **403** on “login role”, your Supabase account may lack org access to this project on the Management API; setting `SUPABASE_DB_PASSWORD` and using `--linked` still connects via Postgres when the password is correct.

## Verify

```powershell
npx supabase projects list
cat supabase\.temp\project-ref
```

Expected linked ref: `tpotdxasputlvppvpult`.
