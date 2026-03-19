import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
        },
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['test/setup-frontend.ts'],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: ['server/src/**/*.test.ts'],
          setupFiles: ['test/setup-backend.ts'],
        },
      },
    ],
  },
});
