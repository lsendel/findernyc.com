import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      all: false,
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'tests/**',
        'scripts/**',
        'output/**',
        '**/*.config.ts',
        'src/assets/js/main.js',
      ],
      thresholds: {
        lines: 30,
        statements: 30,
        functions: 20,
        branches: 25,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
