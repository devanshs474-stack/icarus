import { defineConfig } from 'vite'

// Dev serves at '/'. The GitHub Pages project site deploys under /icarus/ —
// scripts/deploy.mjs builds with BASE_PATH=/icarus/ for that.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: { port: 5173 },
})
