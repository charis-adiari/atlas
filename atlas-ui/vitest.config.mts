import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/app/**', 'src/types/**', 'src/test/**'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 }
    }
  }
});
