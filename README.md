# Pocket Gains

Deckbuilder home workouts with a cute blob pet that grows with you. Installable PWA; data syncs to Supabase.

## Develop

    npm install
    npm run dev        # http://localhost:5173/pocket-gains/ (local mode unless .env.local exists)
    npm test           # unit + component tests
    npm run e2e        # Playwright, always local mode

## One-time setup

### Supabase
1. Create a free project at supabase.com.
2. SQL Editor → paste and run each file in `supabase/migrations/`, oldest first
   (`20260929000000_init.sql`, then `20260930000000_pet_color.sql`).
3. Authentication → Users → **Add user** → create your email + password (auto-confirm).
4. Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
   The repo and anon key are public, so this stops strangers from creating accounts.
5. Project Settings → API: copy the **Project URL** and the **anon / publishable key**.

### GitHub Pages
1. The repository must be named exactly `pocket-gains` (the app is served from `/pocket-gains/`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   Never add the service-role key anywhere in this repo.
4. Push to `main`. The Deploy workflow publishes `https://<you>.github.io/pocket-gains/`.

### Local cloud mode
Copy `.env.example` to `.env.local` and fill in the two values.

### Install on Android
Open the site in Chrome → sign in → ⋮ → **Install app**.

## Reminders (one-time setup)

1. Run `supabase/migrations/20261001000000_m2.sql`, then `20261002000000_m2_plan_experience.sql`, in the SQL Editor **before** deploying the M2 app.
2. Log in to the CLIs: `npx supabase login` (and `gh auth login` if needed).
3. Keys: `node scripts/setup-vapid.mjs <project-ref> <your-email>`.
   This stores the private key only in Supabase secrets.
4. Deploy the function:
   `npx supabase functions deploy send-reminders --project-ref <project-ref> --no-verify-jwt --use-api`
5. Schedule it. In the SQL Editor, replace the two values and run:

       select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
       select vault.create_secret('<your SECRET key, sb_secret_…>', 'secret_key');
       select cron.schedule('send-reminders', '*/15 * * * *', $$
         select net.http_post(
           url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key'),
             'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
           ),
           body := '{}'::jsonb
         );
       $$);

   The secret key is under Project Settings → API keys. Never put it in the repo.
6. Push to `main` so the app rebuilds with the public VAPID key.

## Credits

Exercise images: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
