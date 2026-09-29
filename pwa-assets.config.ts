import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Maskable (Android adaptive shapes, e.g. Samsung squircles) and Apple icons are padded to keep
// the blob inside the safe zone; the padding is filled with the app background, not white.
const background = '#1e2433'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, padding: 0.3, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
})
