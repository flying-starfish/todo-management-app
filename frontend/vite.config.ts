import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Dockerコンテナ内で外部からアクセス可能にする
    port: 3000,
    open: false, // Dockerコンテナ内では自動起動しない
    watch: {
      usePolling: true, // Dockerボリューム内でのホットリロードを有効化
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
