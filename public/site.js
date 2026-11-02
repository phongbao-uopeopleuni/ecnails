const toggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
function closeMenu() {
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Open navigation');
  if (mobileNav) mobileNav.hidden = true;
}
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    toggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
matchMedia('(min-width: 1001px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const tiles = [...document.querySelectorAll('[data-lightbox]')];
const filters = document.querySelectorAll('[data-filter]');
filters.forEach(filter => filter.addEventListener('click', () => {
  filters.forEach(button => button.setAttribute('aria-pressed', String(button === filter)));
  const category = filter.dataset.filter;
  tiles.forEach(tile => { tile.hidden = category !== 'all' && tile.dataset.category !== category; });
  const count = tiles.filter(tile => !tile.hidden).length;
  const label = document.querySelector('.gallery-count');
  if (label) label.textContent = `${count} ${count === 1 ? 'look' : 'looks'} to inspire you`;
}));

const dialog = document.querySelector('.lightbox');
const zoomButton = dialog?.querySelector('.lightbox-zoom');
const originalImageLink = dialog?.querySelector('.lightbox-original');
let selected = 0;
let trigger;
let visibleTiles = [];
function resetZoom() {
  dialog.classList.remove('is-zoomed');
  zoomButton.setAttribute('aria-pressed', 'false');
  zoomButton.textContent = 'Zoom to 100%';
  dialog.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}
function showImage(index) {
  if (!visibleTiles.length) return;
  selected = (index + visibleTiles.length) % visibleTiles.length;
  const tile = visibleTiles[selected];
  resetZoom();
  const zoomable = tile.hasAttribute('data-zoomable');
  dialog.classList.toggle('has-zoom', zoomable);
  dialog.querySelector('.lightbox-tools').hidden = !zoomable;
  originalImageLink.href = tile.dataset.lightbox;
  const img = dialog.querySelector('img');
  img.src = tile.dataset.lightbox;
  img.alt = tile.dataset.caption;
  dialog.querySelector('figcaption').textContent = tile.dataset.caption;
  dialog.querySelector('.lightbox-position').textContent = `${selected + 1} / ${visibleTiles.length}`;
}
tiles.forEach(tile => tile.addEventListener('click', () => {
  trigger = tile;
  visibleTiles = tiles.filter(item => !item.hidden);
  showImage(visibleTiles.indexOf(tile));
  dialog.showModal();
  document.body.classList.add('lightbox-open');
  dialog.querySelector('.lightbox-close').focus();
}));
dialog?.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
dialog?.querySelector('.lightbox-prev').addEventListener('click', () => showImage(selected - 1));
dialog?.querySelector('.lightbox-next').addEventListener('click', () => showImage(selected + 1));
zoomButton?.addEventListener('click', () => {
  const zoomed = dialog.classList.toggle('is-zoomed');
  zoomButton.setAttribute('aria-pressed', String(zoomed));
  zoomButton.textContent = zoomed ? 'Fit to screen' : 'Zoom to 100%';
  dialog.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});
dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(selected - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showImage(selected + 1); }
});
dialog?.addEventListener('close', () => {
  resetZoom();
  document.body.classList.remove('lightbox-open');
  trigger?.focus({ preventScroll: true });
});

// Google Sites heading links remain valid after the migration.
function openHashTarget() {
  if (location.hash.length < 2) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}
addEventListener('hashchange', openHashTarget);
if (location.hash) addEventListener('load', openHashTarget, { once: true });
