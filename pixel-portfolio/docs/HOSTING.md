# Putting Office Quest online (public link)

The ready-to-upload site is the **`website/`** folder (also zipped as `office-quest-website.zip`).
It is plain files (HTML + JS + images), so any web host works. No server software is needed.

## A) Hostinger (hPanel)
1. Download `office-quest-website.zip` from GitHub (open the file, click the download icon).
2. Log in to hPanel > **Websites** > pick your site > **File Manager**.
3. Open `public_html`. To keep your existing site, make a new folder there called `game`.
   (To use the main address instead, upload into `public_html` itself.)
4. Open the `game` folder > **Upload** (top right) > choose the zip > then right-click the zip > **Extract**.
   Make sure `index.html` sits directly inside `game` (not inside another sub-folder). Delete the zip.
5. Visit `https://your-domain.com/game/`. That is the link to share.
6. Updating later: run `npm run site`, upload the new `website/` contents, and overwrite.

## B) Free alternatives
- **GitHub Pages**: repo Settings > Pages > Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes on every push to `main`.
- **Netlify Drop** (app.netlify.com/drop): drag the `website` folder onto the page; you get a link at once.

## Notes
- Progress is saved in each visitor's own browser (localStorage); nobody sees anyone else's data.
- The phone number and email in the Contact world are public once the site is public.
- Emails typed at the login are not collected anywhere until `EMAIL_ENDPOINT` in `src/config.js` is set.
