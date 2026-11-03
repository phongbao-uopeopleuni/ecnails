// Browser QA for dist/: layout, text size, contrast (solid colours and text over photos), accessible names,
// console errors, page weight and the menu / gallery / lightbox flows, on every page at several widths.
// Needs Google Chrome (set CHROME_PATH if it is not in the default Windows location). Run after `npm run build`.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, dirname, extname, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const pages = ['home', 'services', 'our-gallery', 'about', 'contact', 'missing-page'];
const widths = [320, 390, 768, 1024, 1440];
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!extname(path)) path += '.html';
  const file = resolve(dist, '.' + path);
  try {
    if (!file.startsWith(dist + sep)) throw Error('outside dist');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': types['.html'] }); res.end(await readFile(resolve(dist, '404.html')));
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// Runs inside the page. Must stay self-contained: it is serialised with Function.prototype.toString.
async function pageAudit() {
  const vw = document.documentElement.clientWidth, errors = [], warnings = [], photoText = [];
  const name = el => typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase();
  const visible = el => el.getClientRects().length && !el.closest('dialog:not([open]),[hidden],.sr-only,.skip-link,.gallery-run-clone') && getComputedStyle(el).visibility !== 'hidden';
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const mix = (top, under) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const needs = cs => { const s = parseFloat(cs.fontSize); return s >= 24 || (s >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5; };
  const photo = '.hero-photo,.about-photo,.location-image,.service-image,.gallery-tile,.story-photo';
  const solidBackground = el => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none' || n.matches(photo)) return null;
      const c = rgba(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] === 1) break; }
    }
    return layers.reverse().reduce((under, c) => mix(c, under), [255, 255, 255, 1]);
  };
  // Worst contrast of a text node over a cover-fitted <img> plus a vertical gradient overlay, read from real pixels.
  const overPhoto = (textEl, img, overlay) => {
    const box = img.getBoundingClientRect(), bw = Math.round(box.width), bh = Math.round(box.height), W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !bw || !bh) return null;
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const s = Math.max(bw / W, bh / H), sw = bw / s, sh = bh / s;
    const canvas = document.createElement('canvas'); canvas.width = bw; canvas.height = bh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, (W - sw) * px, (H - sh) * py, sw, sh, 0, 0, bw, bh);
    const data = ctx.getImageData(0, 0, bw, bh).data;
    const stops = [...overlay.gradient.matchAll(/rgba?\([^)]+\)\s*([\d.]+%)?/g)].map((m, i, all) => ({ c: rgba(m[0]), at: m[1] ? parseFloat(m[1]) / 100 : i / (all.length - 1) }));
    const tint = y => {
      if (!stops.length || y < overlay.top) return [0, 0, 0, 0];
      const t = Math.min(1, (y - overlay.top) / overlay.height);
      for (let i = 1; i < stops.length; i++) if (t <= stops[i].at) { const a = stops[i - 1], b = stops[i], k = (t - a.at) / ((b.at - a.at) || 1); return [...b.c.slice(0, 3), a.c[3] + (b.c[3] - a.c[3]) * k]; }
      return stops.at(-1).c;
    };
    const fg = rgba(getComputedStyle(textEl).color), range = document.createRange(); range.selectNodeContents(textEl);
    let worst = Infinity;
    for (const r of range.getClientRects()) for (let y = Math.ceil(r.top); y < r.bottom; y++) for (let x = Math.ceil(r.left); x < r.right; x++) {
      const ix = Math.floor(x - box.left), iy = Math.floor(y - box.top); if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) continue;
      const i = (iy * bw + ix) * 4, bg = mix(tint(y), [data[i], data[i + 1], data[i + 2], 1]);
      worst = Math.min(worst, ratio(mix(fg, bg), bg));
    }
    return worst === Infinity ? null : worst;
  };

  if (!document.documentElement.lang) errors.push('missing <html lang>');
  if (document.documentElement.scrollWidth > vw) errors.push(`horizontal overflow ${document.documentElement.scrollWidth - vw}px`);
  const measured = new Set(), unmeasured = new Set();
  const hero = document.querySelector('.hero-photo');
  if (hero) {
    const after = getComputedStyle(hero, '::after'), r = hero.getBoundingClientRect(), top = parseFloat(after.top);
    hero.querySelectorAll('.photo-label span').forEach(span => { if (!visible(span)) return; measured.add(span); const v = overPhoto(span, hero.querySelector('.hero-image'), { gradient: after.backgroundImage, top: r.top + top, height: r.height - top }); if (v !== null) photoText.push({ text: span.textContent.trim(), worst: +v.toFixed(2) }); });
  }
  for (const p of photoText) if (p.worst < 4.5) errors.push(`text over photo ${p.worst}:1 "${p.text}"`);

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || !ownText(el)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), size = parseFloat(cs.fontSize);
    if (!el.closest('[data-gallery-marquee],.announcement') && (r.right > vw + 1 || r.left < -1)) errors.push(`off-screen text ${name(el)}`);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) errors.push(`clipped text ${name(el)}`);
    if (size < 11 && !el.closest('.brand-sub')) errors.push(`text under 11px ${name(el)} (${size}px)`);
    const bg = solidBackground(el);
    if (bg) { const v = ratio(mix(rgba(cs.color), bg), bg); if (v < needs(cs)) errors.push(`contrast ${v.toFixed(2)}:1 ${name(el)}`); }
    else if (!measured.has(el)) unmeasured.add(name(el));
  }
  // One-line boxes must fit their text: overflow stays visible, so it would spill onto the next item (announcement bar, 1024px).
  // Measure the text itself (Range), since centred text overflows both sides and scrollWidth misses the left side.
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.clientWidth === 0 || getComputedStyle(el).whiteSpace !== 'nowrap' || el.closest('[data-gallery-marquee]')) continue;
    const range = document.createRange(); range.selectNodeContents(el);
    const t = range.getBoundingClientRect(), b = el.getBoundingClientRect(), spill = Math.max(b.left - t.left, t.right - b.right);
    if (t.width && spill > 1) errors.push(`text overflows its box ${name(el)} (${Math.round(spill)}px)`);
  }
  const hit =(a, b) => { const p = a.getBoundingClientRect(), q = b.getBoundingClientRect(); return p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1; };
  for (const box of document.querySelectorAll('.header-inner,.brand,.photo-label,.hero-index,.hero-actions,.location-actions,.hours-strip,.footer-signature,.footer-nav,.footer-bottom,.contact-hours,.gallery-toolbar,.story-photo-label,.product-design-heading,.menu-group-heading,.service-title,.announcement')) {
    const kids = [...box.children].filter(visible);
    kids.forEach((a, i) => kids.slice(i + 1).forEach(b => { if (hit(a, b)) errors.push(`overlap in ${name(box)}: ${name(a)} × ${name(b)}`); }));
  }
  document.querySelectorAll('img').forEach(img => {
    if (img.closest('dialog')) return;
    if (!img.hasAttribute('alt')) errors.push(`img without alt ${img.getAttribute('src')}`);
    if (img.complete && !img.naturalWidth) errors.push(`broken image ${img.currentSrc || img.src}`);
  });
  document.querySelectorAll('a[href],button').forEach(el => {
    if (!visible(el)) return;
    if (!(el.getAttribute('aria-label') || el.textContent.trim() || el.querySelector('img[alt]:not([alt=""])'))) errors.push(`control without accessible name ${name(el)}`);
    const r = el.getBoundingClientRect();
    if ((r.width < 24 || r.height < 24) && !el.closest('p,address')) warnings.push(`target under 24px ${name(el)} "${el.textContent.trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  let last = 0;
  document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
    if (h.closest('dialog,[hidden]')) return;
    const level = +h.tagName[1]; if (last && level > last + 1) warnings.push(`heading jumps h${last}→h${level} "${h.textContent.trim().slice(0, 30)}"`); last = level;
  });
  if (unmeasured.size) warnings.push(`text over images not contrast-checked: ${[...unmeasured].join(', ')}`);
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], photoText };
}
async function mobileMenuFlow() {
  const toggle = document.querySelector('.menu-toggle'), nav = document.querySelector('.mobile-nav');
  toggle.click(); const opened = !nav.hidden && toggle.getAttribute('aria-expanded') === 'true';
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const closed = nav.hidden && toggle.getAttribute('aria-expanded') === 'false' && document.activeElement === toggle;
  return opened && closed ? '' : `mobile menu flow: opened=${opened} closed=${closed}`;
}
async function galleryFlow() {
  const problems = [], tiles = [...document.querySelectorAll('.gallery-grid [data-lightbox]')], dialog = document.querySelector('.lightbox');
  for (const filter of document.querySelectorAll('[data-filter]')) {
    filter.click();
    const shown = tiles.filter(t => !t.hidden).length, expected = filter.dataset.filter === 'all' ? tiles.length : tiles.filter(t => t.dataset.category === filter.dataset.filter).length;
    if (shown !== expected || filter.getAttribute('aria-pressed') !== 'true') problems.push(`filter ${filter.dataset.filter} shows ${shown}/${expected}`);
  }
  document.querySelector('[data-filter="all"]').click();
  tiles[0].click();
  const first = dialog.querySelector('.lightbox-position').textContent;
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const second = dialog.querySelector('.lightbox-position').textContent, img = dialog.querySelector('img');
  if (!dialog.open || first !== `1 / ${tiles.length}` || second !== `2 / ${tiles.length}`) problems.push(`lightbox: open=${dialog.open} ${first} → ${second}`);
  await new Promise(r => { if (img.complete) r(); else img.onload = img.onerror = r; });
  if (!img.naturalWidth) problems.push('lightbox image did not load');
  dialog.querySelector('.lightbox-close').click(); await new Promise(r => setTimeout(r, 100));
  if (dialog.open || document.activeElement !== tiles[0]) problems.push('lightbox close / focus return');
  return problems.join('; ');
}
async function inspirationFlow() {
  const problems = [], marquee = document.querySelector('[data-gallery-marquee]'), original = marquee?.querySelector('.gallery-run:not(.gallery-run-clone)'), clone = marquee?.querySelector('.gallery-run-clone');
  const tiles = [...(original?.querySelectorAll('[data-lightbox]') || [])];
  if (!marquee?.classList.contains('is-ready') || tiles.length < 8) problems.push(`inspiration strip ready=${marquee?.classList.contains('is-ready')} images=${tiles.length}`);
  if (!clone || clone.getAttribute('aria-hidden') !== 'true' || !clone.inert || clone.querySelector('[data-lightbox]')) problems.push('inspiration clone is not safely hidden/inert');
  const animation = marquee ? getComputedStyle(marquee.querySelector('.inspiration-track')).animationName : 'none';
  if (!animation || animation === 'none') problems.push(`inspiration animation=${animation}`);
  if (tiles[0]) {
    const dialog = document.querySelector('.lightbox');
    tiles[0].click();
    if (!dialog.open || dialog.querySelector('.lightbox-position').textContent !== `1 / ${tiles.length}`) problems.push('inspiration lightbox did not open with the original image set');
    dialog.querySelector('.lightbox-close').click(); await new Promise(r => setTimeout(r, 100));
    if (dialog.open || document.activeElement !== tiles[0]) problems.push('inspiration lightbox close / focus return');
  }
  return problems.join('; ');
}
async function homeMobileFlow() {
  const problems = [], toggle = document.querySelector('.menu-toggle'), nav = document.querySelector('.mobile-nav');
  toggle.click(); const opened = !nav.hidden && toggle.getAttribute('aria-expanded') === 'true';
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (!opened || !nav.hidden || toggle.getAttribute('aria-expanded') !== 'false' || document.activeElement !== toggle) problems.push(`mobile menu opened=${opened} closed=${nav.hidden}`);
  const announcement = document.querySelector('.announcement'), announcementLinks = [...(announcement?.querySelectorAll('.announcement-location') || [])];
  if (announcementLinks.length !== 3 || !announcementLinks.every(link => link.getAttribute('href')?.startsWith('tel:+1'))) problems.push(`location announcement links=${announcementLinks.length}`);
  if (!announcement || announcement.scrollWidth <= announcement.clientWidth) problems.push('location announcement is not horizontally scrollable on mobile');
  const marquee = document.querySelector('[data-gallery-marquee]'), original = marquee?.querySelector('.gallery-run:not(.gallery-run-clone)'), clone = marquee?.querySelector('.gallery-run-clone');
  const tiles = [...(original?.querySelectorAll('[data-lightbox]') || [])];
  if (!marquee?.classList.contains('is-ready') || tiles.length < 8) problems.push(`inspiration strip ready=${marquee?.classList.contains('is-ready')} images=${tiles.length}`);
  if (!clone || clone.getAttribute('aria-hidden') !== 'true' || !clone.inert || clone.querySelector('[data-lightbox]')) problems.push('inspiration clone is not safely hidden/inert');
  const animation = marquee ? getComputedStyle(marquee.querySelector('.inspiration-track')).animationName : 'none';
  if (!animation || animation === 'none') problems.push(`inspiration animation=${animation}`);
  if (tiles[0]) {
    const dialog = document.querySelector('.lightbox');
    tiles[0].click();
    if (!dialog.open || dialog.querySelector('.lightbox-position').textContent !== `1 / ${tiles.length}`) problems.push('inspiration lightbox did not open with the original image set');
    dialog.querySelector('.lightbox-close').click(); await new Promise(r => setTimeout(r, 100));
    if (dialog.open || document.activeElement !== tiles[0]) problems.push('inspiration lightbox close / focus return');
  }
  return problems.join('; ');
}
async function menuSheetFlow() {
  const dialog = document.querySelector('.lightbox');
  document.querySelector('.product-design-image').click();
  const tools = !dialog.querySelector('.lightbox-tools').hidden;
  dialog.querySelector('.lightbox-zoom').click(); const zoomed = dialog.classList.contains('is-zoomed');
  dialog.querySelector('.lightbox-close').click(); await new Promise(r => setTimeout(r, 100));
  return tools && zoomed && !dialog.open ? '' : `menu poster viewer: tools=${tools} zoomed=${zoomed} closed=${!dialog.open}`;
}
// Home reviews: Google links for every salon; when more cards exist than fit collapsed, "Show all" opens and closes them.
async function reviewsFlow() {
  const section = document.querySelector('[data-reviews]');
  if (!section) return 'Home reviews section missing';
  const problems = [], links = [...section.querySelectorAll('.review-source-links a')];
  if (links.length !== 6 || !links.every(a => a.target === '_blank' && /noopener/.test(a.rel) && a.href.startsWith('https://'))) problems.push(`review links=${links.length}`);
  const cards = [...section.querySelectorAll('.review-card')], more = section.querySelector('.review-more'), shown = () => cards.filter(c => c.offsetParent).length;
  if (more && !more.hidden) {
    const collapsed = shown(); more.click(); const opened = shown(); more.click();
    if (collapsed >= cards.length || opened !== cards.length || shown() !== collapsed || more.getAttribute('aria-expanded') !== 'false') problems.push(`review toggle collapsed=${collapsed} opened=${opened} total=${cards.length}`);
  } else if (shown() !== cards.length) problems.push(`reviews hidden without a Show all button: ${shown()}/${cards.length}`);
  return problems.join('; ');
}
const flows = { 'home@390': [homeMobileFlow, reviewsFlow], 'home@768': reviewsFlow, 'home@1440': [inspirationFlow, reviewsFlow], 'our-gallery@1440': galleryFlow, 'our-gallery@390': galleryFlow, 'services@1440': menuSheetFlow };

const profile = await mkdtemp(join(tmpdir(), 'ecn-audit-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
const report = { generated: new Date().toISOString(), widths, pages: {} };
let errorCount = 0;
try {
  let port;
  for (let i = 0; i < 150 && !port; i++) { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await sleep(100); } }
  if (!port) throw Error(`Chrome did not start (${chromePath}). Set CHROME_PATH.`);
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let seq = 0, consoleLog = [], bytes = 0;
  const pending = new Map(), listeners = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); } else listeners.forEach(l => l(m)); };
  const send = (method, params = {}) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, m => m.error ? fail(Error(`${method}: ${m.error.message}`)) : ok(m.result)); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  listeners.push(m => {
    if (m.method === 'Runtime.exceptionThrown') consoleLog.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consoleLog.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) consoleLog.push(`${m.params.entry.text} ${m.params.entry.url || ''}`.trim());
    if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength;
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 1000 });
    for (const page of pages) {
      consoleLog = []; bytes = 0;
      let loaded = false; const onLoad = m => { if (m.method === 'Page.loadEventFired') loaded = true; }; listeners.push(onLoad);
      await send('Page.navigate', { url: `${origin}/${page}` });
      for (let i = 0; i < 300 && !loaded; i++) await sleep(50);
      listeners.splice(listeners.indexOf(onLoad), 1);
      // Load lazy images too, so every image is checked and counted in the page weight.
      await evaluate(`(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }); await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); })()`);
      const result = await evaluate(`(${pageAudit})()`);
      for (const flow of [flows[`${page}@${width}`]].flat().filter(Boolean)) { const problem = await evaluate(`(${flow})()`); if (problem) result.errors.push(problem); }
      await sleep(100);
      result.errors.push(...consoleLog.filter(e => !(page === 'missing-page' && /status of 404/.test(e))).map(e => `console: ${e}`));
      result.bytes = bytes;
      report.pages[`${page}@${width}`] = result;
      errorCount += result.errors.length;
    }
  }
  ws.close();
} finally {
  chrome.kill(); server.close();
  await sleep(300); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
await mkdir(resolve(root, 'verification'), { recursive: true });
await writeFile(resolve(root, 'verification/audit-latest.json'), JSON.stringify(report, null, 2));
for (const [key, r] of Object.entries(report.pages)) {
  const photos = r.photoText.length ? ` text-over-photo min ${Math.min(...r.photoText.map(p => p.worst))}:1` : '';
  console.log(`${r.errors.length ? 'FAIL' : 'ok  '} ${key.padEnd(22)} ${String(Math.round(r.bytes / 1024)).padStart(5)} KB${photos}`);
  r.errors.forEach(e => console.log(`       error: ${e}`));
}
const warnings = [...new Set(Object.values(report.pages).flatMap(r => r.warnings))];
warnings.forEach(w => console.log(`warning: ${w}`));
console.log(`${errorCount ? 'FAIL' : 'PASS'}: ${pages.length} pages × ${widths.length} widths, ${errorCount} errors, ${warnings.length} distinct warnings. Report: verification/audit-latest.json`);
process.exitCode = errorCount ? 1 : 0;
