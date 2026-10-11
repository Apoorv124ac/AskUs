// Builds the Pocket Edition into ./releases/pocket-site (upload that folder's contents, or the zip).
import { build } from 'vite';
import { rmSync, existsSync, renameSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';

process.env.POCKET = '1';
const out = 'releases/pocket-site';
if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync('releases', { recursive: true });
await build({ logLevel: 'warn', build: { outDir: out, emptyOutDir: true } });
renameSync(`${out}/pocket.html`, `${out}/index.html`);
writeFileSync(`${out}/.nojekyll`, '');
console.log('Done: releases/pocket-site');
