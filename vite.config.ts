/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { curriculumPlugin } from './tooling/curriculum/plugin';

// Strict Content-Security-Policy for production builds: everything from our own
// origin, no outbound connections. Not applied in dev (Vite's HMR needs a websocket).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin: Plugin = {
  name: 'ziggy-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    );
  },
};

// Served from https://jnthnvctr.github.io/ziggy/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/ziggy/',
  plugins: [react(), curriculumPlugin(), cspPlugin],
  build: { sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tooling/**/*.test.ts'],
  },
});
