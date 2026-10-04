import { defineConfig } from 'vite';

// Relative base so the built game works from any sub-folder (GitHub Pages, itch.io, a CDN...).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
