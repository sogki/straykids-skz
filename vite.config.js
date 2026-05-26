import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const jypeImageProxy = {
  target: 'https://d1al7qj7ydfbpt.cloudfront.net',
  changeOrigin: true,
  rewrite: (reqPath) => reqPath.replace(/^\/api\/jype-image/, ''),
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/jype-image': jypeImageProxy,
    },
  },
  preview: {
    proxy: {
      '/api/jype-image': jypeImageProxy,
    },
  },
})
