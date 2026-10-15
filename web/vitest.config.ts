import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Firebase 13's package export points Node at a missing auth/index.mjs,
      // while Vite correctly uses this browser ESM entry for the web app.
      'firebase/app': path.resolve(__dirname, './node_modules/firebase/app/dist/esm/index.esm.js'),
      'firebase/auth': path.resolve(__dirname, './node_modules/firebase/auth/dist/esm/index.esm.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    testTimeout: 10000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
