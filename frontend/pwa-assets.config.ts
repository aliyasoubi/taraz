import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // iOS shows the touch icon on a black tile; give it the app's own background.
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#07060d' } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#07060d' } },
  },
  images: ['public/logo.svg'],
})
