import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'tests/**',
        'scripts/**',
        'output/**',
        '**/*.config.ts',
        'src/assets/js/main.js',
      ],
      thresholds: {
        lines: 55,
        statements: 55,
        functions: 30,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
