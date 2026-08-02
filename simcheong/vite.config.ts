import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5178,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 1400,
  },
});
