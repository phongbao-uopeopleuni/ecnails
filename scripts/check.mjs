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
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const salons = schema['@graph'].filter(n => n['@type'] === 'NailSalon');
  assert.equal(salons.length, 3);
  for (const location of locations) {
    const salon = salons.find(n => n['@id'] === `${origin}/contact#${location.id}`);
    assert.ok(salon, `${path}: original location in structured data`);
    assert.equal(salon.telephone, `+1-${location.phone}`, `${path}: original phone`);
    assert.deepEqual(salon.address, { '@type': 'PostalAddress', streetAddress: location.street, addressLocality: location.city, addressRegion: 'NC', postalCode: location.postal, addressCountry: 'US' }, `${path}: exact original address`);
    if (path !== 'our-gallery') {
      assert.ok(decode(html).includes(location.address), `${path}: visible original address`);
      assert.ok(html.includes(location.phone), `${path}: visible original phone`);
    }
  }
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
assert.doesNotMatch(Object.values(pages).join('\n'), /The details make the difference|gallery-caption/, 'Decorative gallery captions removed from every page');
assert.doesNotMatch(pages.home, /hero-index|BEAUTY IN EVERY DETAIL|SCROLL TO DISCOVER/i, 'Decorative line below the Home hero removed');
const heroEnd = pages.home.indexOf('</section>', pages.home.indexOf('<section class="hero">'));
const inspirationStart = pages.home.indexOf('<section class="gallery-section inspiration-section');
const servicesStart = pages.home.indexOf('<section class="services-section');
assert.ok(heroEnd !== -1 && heroEnd < inspirationStart && inspirationStart < servicesStart, 'Home inspiration strip sits directly after the hero and before services');
assert.ok((pages.home.match(/class="[^"]*inspiration-slide/g) || []).length >= 8, 'Home inspiration strip contains multiple images');
assert.ok(pages.home.includes('data-gallery-marquee'), 'Home inspiration strip is configured for motion');
assert.equal((pages.services.match(/class="menu-sheet"/g) || []).length, menuSheets.length, 'All 8 original menu sheets retained');
assert.ok(pages.contact.includes('10:00 AM – 08:00 PM') && pages.contact.includes('01:00 PM – 06:00 PM'), 'Original hours retained');
const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
assert.equal(config.cleanUrls, true);
assert.equal(config.redirects[0].source, '/');
assert.equal(config.redirects[0].destination, '/home');
assert.ok(!config.rewrites, 'Unknown URLs retain 404 rather than showing home');
const error = await readFile(resolve(root, 'dist/404.html'), 'utf8');
assert.ok(error.includes('noindex,follow'));
const footerOf = html => html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
const announcementOf = html => html.match(/<div class="announcement"[\s\S]*?<\/div><\/div>/)?.[0];
const sharedFooter = footerOf(pages.home);
const sharedAnnouncement = announcementOf(pages.home);
assert.ok(sharedFooter, 'Shared footer exists');
assert.ok(sharedAnnouncement, 'Shared location announcement exists');
for (const [path, html] of Object.entries({ ...pages, '404': error })) {
  assert.doesNotMatch(html, /[\w.+-]+@ecstarnailsandspagreenvillenc\.com|mailto:/i, `${path}: email removed from public HTML and structured data`);
  assert.equal(footerOf(html), sharedFooter, `${path}: same footer across templates`);
  assert.equal(announcementOf(html), sharedAnnouncement, `${path}: same location announcement across templates`);
  assert.equal((announcementOf(html).match(/class="announcement-location"/g) || []).length, locations.length, `${path}: three announcement locations`);
  for (const [i, location] of locations.entries()) {
    assert.ok(announcementOf(html).includes(`Location ${i + 1}: ${location.name}`), `${path}: announcement location ${i + 1} name`);
    assert.ok(announcementOf(html).includes(`Phone ${location.phone}`), `${path}: announcement location ${i + 1} phone`);
    assert.ok(announcementOf(html).includes(`href="tel:+1${location.phone.replaceAll('-', '')}"`), `${path}: announcement location ${i + 1} callable`);
  }
  assert.doesNotMatch(announcementOf(html), /A little time for yourself|A beautiful feeling|Greenville & Washington, NC/i, `${path}: old announcement removed`);
  assert.doesNotMatch(footerOf(html), /footer-locations|footer-phone|data-cta=|href="tel:|maps\/dir\//, `${path}: no duplicate location block in footer`);
  assert.doesNotMatch(footerOf(html), /footer-hours|Open hours|Monday|Sunday|10:00 AM|08:00 PM|01:00 PM|06:00 PM/i, `${path}: no opening hours in footer`);
}
console.log(`PASS: 5 preserved routes; ${links} internal links; ${assets.size} referenced assets; exact addresses, phones, hours, home/about copy; 23 gallery photos; moving Home inspiration strip; no gallery captions or hero index; 8 original menu sheets; legacy heading anchors; shared three-location announcement; shared footer across 6 templates without hours; no public email; Vercel clean URLs and 404.`);
