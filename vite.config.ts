import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Set base to repo name for GitHub Pages; use '/' for custom domain
  base: command === 'build' ? '/led-screen/' : '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}))
