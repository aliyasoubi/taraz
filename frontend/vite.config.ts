import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/main.tsx so no inline script is needed (strict CSP).
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'تراز — حساب بیماران',
        short_name: 'تراز',
        description: 'پیگیری مانده حساب و پرداخت‌های بیماران',
        lang: 'fa',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#07060d',
        background_color: '#07060d',
      },
      workbox: {
        navigateFallback: '/index.html',
        // Patient data is never cached offline; only the app shell is.
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
})
