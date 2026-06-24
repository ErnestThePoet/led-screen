import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Set base to repo name for GitHub Pages; use '/' for custom domain
  base: command === 'build' ? '/led-screen/' : '/',
  // react-draggable's ESM build references process.env.DRAGGABLE_DEBUG, which is a
  // Node.js global absent in browsers. Replace it at bundle time so the dead branch
  // is eliminated and the app doesn't crash on drag or on position-prop changes.
  define: {
    'process.env.DRAGGABLE_DEBUG': 'false',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
