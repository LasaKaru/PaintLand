/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // /api (admin panel, branding, analytics) lives on the relay: npm run server.
  server: { host: true, port: 5173, proxy: { '/api': { target: `http://localhost:${process.env.RELAY_PORT ?? 8787}`, changeOrigin: true } } },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
