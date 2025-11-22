import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/react-app-env.d.ts',
        'src/vite-env.d.ts',
        'src/index.tsx',
        '**/*.d.ts',
      ],
      thresholds: {
        branches: 45,
        functions: 45,
        lines: 45,
        statements: 45,
      },
    },
  },
});
