// SITE=1 (tools/export-site.mjs) builds only the game page into ./website for hosting.
const site = !!process.env.SITE;
export default {
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    outDir: site ? 'website' : 'dist',
    rollupOptions: { input: site ? { main: 'index.html' } : { main: 'index.html', heroPreview: 'hero-preview.html' } },
  },
};
