// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'PaletteMatch AI - 肌色診断＆服のカラーコーディネート提案',
      meta: [
        { name: 'description', content: 'カメラで肌色を診断し、パーソナルカラーに合わせた服の配色比率をローカルAIが提案します。プライバシーに配慮した完全オンデバイス処理。' },
        { property: 'og:title', content: 'PaletteMatch AI - 肌色診断＆服のカラーコーディネート提案' },
        { property: 'og:description', content: 'カメラで肌色を診断し、パーソナルカラーに合わせた服の配色比率をローカルAIが提案します。プライバシーに配慮した完全オンデバイス処理。' }
      ],
      script: [
        { src: `${process.env.NUXT_APP_BASE_URL || '/'}coi-serviceworker.js`.replace(/\/{2,}/g, '/') }
      ]
    }
  },
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
    }
  }
})

