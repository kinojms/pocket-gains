/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pocket-gains/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'exercises/*.jpg'],
      manifest: {
        id: '/pocket-gains/',
        name: 'Pocket Gains',
        short_name: 'Pocket Gains',
        description: 'Deckbuilder home workouts with a cute blob pet that grows with you.',
        start_url: '/pocket-gains/',
        scope: '/pocket-gains/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e2433',
        theme_color: '#1e2433',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    // Unit tests always run in local mode (no Supabase), whatever .env.local says; tests that need cloud mode mock it.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
  },
})
