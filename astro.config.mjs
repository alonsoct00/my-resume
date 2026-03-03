import { defineConfig } from 'astro/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  site: 'https://alonsoct.dev',
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})