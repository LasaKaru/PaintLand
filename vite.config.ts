/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/** The build's version for crash reports: the release number (CI sets it) or package version + commit. */
function buildVersion(): string {
  if (process.env.INKROADS_VERSION) return process.env.INKROADS_VERSION;
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  try {
    return `${pkg.version}+${execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`;
  } catch {
    return pkg.version;
  }
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(buildVersion()) },
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
