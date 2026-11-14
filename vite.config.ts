import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Vendor code in its own long-cached chunks; app changes then re-download only the small app chunk.
    chunkSizeWarningLimit: 1000, // three.js alone is ~950 kB minified
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|@react-three)[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  server: {
    // Dev stand-in for functions/api/horizons.ts (Cloudflare Pages Function in production).
    proxy: {
      '/api/horizons': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/horizons/, '/api/horizons.api') + '&format=json',
      },
    },
  },
})
