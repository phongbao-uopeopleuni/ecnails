import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { origin, locations, introduction, menuSheets, gallery } from '../src/data.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = ['home', 'services', 'our-gallery', 'about', 'contact'];
const pages = Object.fromEntries(await Promise.all(paths.map(async path => [path, await readFile(resolve(root, 'dist', `${path}.html`), 'utf8')])));
const legacy = JSON.parse(await readFile(resolve(root, 'src/legacy.json'), 'utf8'));
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
let links = 0, assets = new Set();
for (const [path, html] of Object.entries(pages)) {
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one main heading`);
  assert.ok(html.includes(`<link rel="canonical" href="${origin}/${path}">`), `${path}: original canonical URL`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, `${path}: duplicate HTML IDs`);
  for (const location of locations) {
    assert.ok(decode(html).includes(location.address), `${path}: exact original address`);
    assert.ok(html.includes(location.phone), `${path}: original phone`);
  }
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@graph'].filter(n => n['@type'] === 'NailSalon').length, 3);
  for (const match of html.matchAll(/(?:href|src|data-lightbox)="([^"]+)"/g)) {
    const href = decode(match[1]);
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    links++;
    const u = new URL(href, `${origin}/${path}`);
    const segment = u.pathname.slice(1);
    if (segment.includes('.')) {
      await access(resolve(root, 'dist', segment));
      assets.add(segment);
    } else {
      assert.ok(pages[segment], `${path}: target page ${segment} exists`);
      if (u.hash) assert.ok(pages[segment].includes(`id="${u.hash.slice(1)}"`), `${path}: anchor ${href} exists`);
    }
  }
  for (const hash of legacy[path].links.filter(l => l.startsWith('#'))) {
    assert.ok(html.includes(`id="${hash.slice(1)}"`), `${path}: original Google Sites heading link ${hash}`);
  }
}
for (const text of introduction) assert.ok(decode(pages.home).includes(text), 'Home introduction retained');
for (const text of legacy.about.text.filter(t => t.startsWith('For over a decade,') || t.startsWith('But beyond our history'))) assert.ok(decode(pages.about).includes(text), 'About paragraphs retained in full');
assert.equal((pages['our-gallery'].match(/data-lightbox=/g) || []).length, gallery.length, 'All 23 original gallery photos retained');
assert.equal((pages.services.match(/class="menu-sheet"/g) || []).length, menuSheets.length, 'All 8 original menu sheets retained');
assert.ok(pages.contact.includes('[email removed]'), 'Original contact email retained');
assert.ok(pages.contact.includes('10:00 AM – 08:00 PM') && pages.contact.includes('01:00 PM – 06:00 PM'), 'Original hours retained');
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
assert.equal(config.cleanUrls, true);
assert.equal(config.redirects[0].source, '/');
assert.equal(config.redirects[0].destination, '/home');
assert.ok(!config.rewrites, 'Unknown URLs retain 404 rather than showing home');
const error = await readFile(resolve(root, 'dist/404.html'), 'utf8');
assert.ok(error.includes('noindex,follow'));
console.log(`PASS: 5 preserved routes; ${links} internal links; ${assets.size} referenced assets; exact addresses, phones, hours, home/about copy; 23 gallery photos; 8 original menu sheets; legacy heading anchors; Vercel clean URLs and 404.`);
