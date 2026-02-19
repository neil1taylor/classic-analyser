import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['test/setup-frontend.ts'],
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
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
]);
