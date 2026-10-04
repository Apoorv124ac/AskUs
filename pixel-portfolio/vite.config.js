export default {
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', heroPreview: 'hero-preview.html' } },
  },
};
