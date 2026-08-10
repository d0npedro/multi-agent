/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Base path for assets and the app.
 * Root deploy (default): `/`
 * Subpage under peddavommond.de: `/multi-agent/` via BASE_PATH or VITE_BASE
 *
 * Examples:
 *   npm run build
 *   BASE_PATH=/multi-agent/ npm run build
 *   npm run build:subpage
 */
function resolveBase(): string {
  const raw = process.env.BASE_PATH ?? process.env.VITE_BASE ?? '/';
  if (!raw || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
