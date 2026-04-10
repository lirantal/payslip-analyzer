// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/test-utils/module'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side only - used by the API proxy route
    backendUrl: process.env.BACKEND_URL,
    public: {
      // For local dev: defaults to 'http://localhost:8787' (direct to backend)
      // For production: set NUXT_PUBLIC_API_BASE_URL='' to use proxy via relative URLs
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787',
      r2CdnUrl: process.env.NUXT_PUBLIC_R2_CDN_URL || '',
      // Enable email+password auth by default, disable only if explicitly set to 'false'
      emailPasswordAuthEnabled: process.env.NUXT_PUBLIC_EMAIL_PASSWORD_AUTH_ENABLED !== 'false'
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  devServer: {
    port: 3005
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: 'cloudflare_pages'
    /*
    // the following nitro.devProxy config isn't needed when using Caddy to manage
    // the reverse proxy and domain handling
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
        changeOrigin: true,
        prependPath: true
      }
    }
    */
  },

  vite: {
    server: {
      allowedHosts: ['myapp.com', 'localhost']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    langDir: 'locales/',
    strategy: 'no_prefix',
    defaultLocale: 'en'
  }
})
