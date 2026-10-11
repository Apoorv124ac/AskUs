// SITE=1 (tools/export-site.mjs) builds only the game page into ./website for hosting.
// POCKET=1 (tools/export-pocket.mjs) builds the phone-friendly "Pocket Edition" (pocket.html) instead.
const site = !!process.env.SITE;
const pocket = !!process.env.POCKET;
export default {
  base: './',
  // the Pocket Edition keeps its own save slot and has a real resume file
  define: pocket
    ? { __SAVE_KEY__: JSON.stringify('officeQuest.pocket.save.v1'), __RESUME_URL__: JSON.stringify('./resume/Apoorv_Chaurasia_Resume.pdf') }
    : {},
  build: {
    chunkSizeWarningLimit: 2000,
    outDir: pocket ? 'pocket-dist' : site ? 'website' : 'dist',
    rollupOptions: {
      input: pocket ? { pocket: 'pocket.html' } : site ? { main: 'index.html' } : { main: 'index.html', heroPreview: 'hero-preview.html' },
    },
  },
};
