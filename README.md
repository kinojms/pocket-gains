# Pocket Gains

Deckbuilder home workouts with a pixel pet that grows with you. Installable PWA; data syncs to Supabase.

## Develop

    npm install
    npm run dev        # http://localhost:5173/pocket-gains/ (local mode unless .env.local exists)
    npm test           # unit + component tests
    npm run e2e        # Playwright, always local mode

## One-time setup

### Supabase
1. Create a free project at supabase.com.
2. SQL Editor → paste and run `supabase/migrations/20260929000000_init.sql`.
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

## Credits

Exercise images: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
