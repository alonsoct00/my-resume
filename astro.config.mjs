import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'
import vercel from '@astrojs/vercel/static';


export default defineConfig({
  site: 'https://alonsoct.dev',
  output: 'static',
    adapter: vercel({
    webAnalytics: {
      enabled: true, // set to false when using @vercel/analytics@1.4.0
    },
  }),
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  
})