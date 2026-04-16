import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    env: {
      GOOGLE_MAPS_API_KEY: 'fake-key',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'fake-pass',
      ALLOW_PAID: 'false',
    },
    testTimeout: 10000,
  },
});
