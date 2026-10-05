// Builds the public website into ./website (upload that folder's contents to any web host).
import { build } from 'vite';
import { rmSync, existsSync, writeFileSync } from 'node:fs';

process.env.SITE = '1';
if (existsSync('website')) rmSync('website', { recursive: true });
await build({ logLevel: 'warn' });
writeFileSync('website/.nojekyll', '');
console.log('Done. The "website" folder is ready to upload.');
