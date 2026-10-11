# Office Quest – Pocket Edition

Mobile-first build of the portfolio game (5 stages, project viewer after each stage, feedback form at the end).

## Build
- `npm run pocket` → writes the site to `releases/pocket-site` (index.html at the root).
- Zip the *contents* of that folder and upload to a NEW Hostinger folder (never overwrite old ones).

## Replace sample project pages with real ones
1. Export each PDF page as an image (e.g. `pdftoppm -png -r 110 file.pdf page`).
2. Put them in `public/projects/<n>/` (e.g. `public/projects/1/p1.png`).
3. List them in `PROJECT_IMAGES` in `src/pocket/pages.js`; the viewer then shows them instead of the sample pages.
4. Edit titles/captions in `src/pocket/content.js` (`PROJECTS`).

## Feedback
Sent as a GET to `EMAIL_ENDPOINT` (src/config.js). It lands in the sheet's "Device" column as `feedback N/5 | comment`.
