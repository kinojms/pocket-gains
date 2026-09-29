import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173/lock_in/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/lock_in/',
    reuseExistingServer: !process.env.CI,
    // Empty values force local mode even if a developer has .env.local (Vite never overrides existing env vars).
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    timeout: 120_000,
  },
})
