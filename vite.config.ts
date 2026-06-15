/// <reference types="vitest/config" />
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import compression from 'vite-plugin-compression';
import fs from 'node:fs';
import path from 'node:path';

// Injeta uma versão única (timestamp do build) no public/sw.js para
// invalidar automaticamente todos os caches do Service Worker em cada deploy.
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
function swVersionPlugin() {
  const placeholder = '__SW_VERSION__';
  const version = Date.now().toString();
  return {
    name: 'sw-version-injector',
    apply: 'build' as const,
    closeBundle() {
      const candidates = [path.resolve('dist/sw.js'), path.resolve('dist/client/sw.js'), path.resolve('.output/public/sw.js')];
      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes(placeholder)) {
            fs.writeFileSync(file, content.replaceAll(placeholder, version));
          }
        }
      }
    }
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server"
    }
  },
  vite: {
    base: '/',
    plugins: [compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024
    }), compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024
    }), swVersionPlugin()],
    build: {
      chunkSizeWarningLimit: 1200,
      reportCompressedSize: false,
      cssCodeSplit: true
    }
  }
});