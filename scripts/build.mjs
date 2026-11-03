import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { origin, navigation, locations, introduction, serviceCategories, menus, menuSheets, gallery, reviews, reviewLinks } from '../src/data.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
if (dist !== resolve(root, 'dist') || !dist.startsWith(root)) throw Error('Invalid build output');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
const legacy = JSON.parse(await readFile(resolve(root, 'src/legacy.json'), 'utf8'));
const webImages = new Set(await readdir(resolve(root, 'public/images/web')));
function responsiveImages(html) {
  return html.replace(/<img([^>]*?)src="([^"]+)"([^>]*)>/g, (original, before, src, after) => {
    const stem = src.split('/').at(-1).replace(/\.jpg$/, '');
    if (!webImages.has(`${stem}-960.webp`)) return original;
    return `<img${before}src="/images/web/${stem}-960.webp" srcset="/images/web/${stem}-480.webp 480w, /images/web/${stem}-960.webp 960w" sizes="(max-width: 700px) 100vw, 50vw"${after}>`;
  });
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m7 3 3 5-2 2a14 14 0 0 0 6 6l2-2 5 3v3a2 2 0 0 1-2 2C9.6 22 2 14.4 2 5a2 2 0 0 1 2-2h3Z"/></svg>';
const star = '<svg class="star" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m20 1 4.5 14.5L39 20l-14.5 4.5L20 39l-4.5-14.5L1 20l14.5-4.5Z" stroke="currentColor"/></svg>';
const alias = id => `<span class="legacy-anchor" id="${id}" aria-hidden="true"></span>`;
const phone = location => `tel:+1${location.phone.replaceAll('-', '')}`;
const directions = location => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
const googleMaps = location => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Nail salon ${location.address}`)}`;
const reviewMonth = date => new Date(`${date}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const logo = `<span class="brand-name">EC <span class="brand-star">★</span> NAILS</span><span class="brand-sub">& SPA · NORTH CAROLINA</span>`;
const button = (href, text, cls = 'button') => `<a class="${cls}" href="${href}">${text}${arrow}</a>`;
function salonActions(location, extraClass = '') {
  return `<div class="salon-actions ${extraClass}" data-location="${location.id}"><a class="salon-call" data-cta="call" href="${phone(location)}" aria-label="Call ${escape(location.name)} at ${location.phone}">${phoneIcon}<span>Call now</span></a><a class="salon-directions" data-cta="directions" href="${directions(location)}" target="_blank" rel="noopener noreferrer" aria-label="Get directions to ${escape(location.address)}">${pin}<span>Get directions</span></a></div>`;
}
function serviceLocationCTA() {
  return `<section class="salon-cta wrap" id="services-locations"><div class="section-heading"><div><p class="eyebrow">Three locations. One welcoming feeling.</p><h2>Call or <em>get directions.</em></h2></div></div><div class="salon-cta-grid">${locations.map((l, i) => `<article class="salon-cta-card"><p class="eyebrow">Location ${i + 1} · ${l.city}</p><h3>${l.name}</h3><address>${escape(l.address)}</address><a class="salon-cta-phone" href="${phone(l)}">${l.phone}</a>${salonActions(l)}</article>`).join('')}</div></section>`;
}
function header(page) {
  const locationLinks = locations.map((location, i) => `<a class="announcement-location" href="${phone(location)}" aria-label="Call Location ${i + 1}, ${escape(location.name)}, at ${location.phone}"><span>Location ${i + 1}: ${escape(location.name)}</span><span class="announcement-phone">Phone ${location.phone}</span></a>`).join('');
  return `<div class="announcement" aria-label="Salon locations"><div class="announcement-inner">${locationLinks}</div></div>
    <header class="site-header"><div class="header-inner"><a href="/home" class="brand" aria-label="EC Star Nails & Spa home">${logo}</a><nav class="desktop-nav" aria-label="Main navigation">${navigation.map(([slug, label]) => `<a href="/${slug}" ${page === slug ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><a class="button header-visit" href="/contact#locations">Plan your visit${arrow}</a><button class="menu-toggle" aria-label="Open navigation" aria-controls="mobile-nav" aria-expanded="false"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${navigation.map(([slug, label]) => `<a href="/${slug}" ${page === slug ? 'aria-current="page"' : ''}>${label}${arrow}</a>`).join('')}<a href="/contact#locations">Plan your visit${arrow}</a></nav></header>`;
}
function footer() {
  const legacyLocations = ['h.cm7d2p78gatg', 'h.ccwucn3dnk6k', 'h.cbymgpyv2biw'].map(alias).join('');
  return `<footer class="site-footer"><div class="footer-signature wrap"><a href="/home" class="brand">${logo}</a><p class="footer-tagline">Your local escape for beauty, tranquility, and a little time for you.</p><nav class="footer-nav" aria-label="Footer navigation">${navigation.map(([slug, label]) => `<a href="/${slug}">${label}</a>`).join('')}</nav><div class="footer-ornament" aria-hidden="true"><span></span>${star}<span></span></div></div>${legacyLocations}<div class="footer-bottom wrap"><span>© ${new Date().getFullYear()} EC Star Nails & Spa. All rights reserved.</span><a href="#top">Back to top ↑</a></div></footer>`;
}

function locationCards() {
  return `<div class="location-grid">${locations.map((l, i) => `<article class="location-card" id="${l.id}"><div class="location-image"><img src="${l.image}" width="578" height="578" alt="Location ${i + 1} storefront on ${l.name}, ${l.city}" loading="lazy"><span>0${i + 1} / ${l.city}</span></div><div class="location-content"><p class="eyebrow">${l.city}, North Carolina</p><h3>${l.name}</h3><address>${escape(l.address)}</address><a class="location-phone" href="${phone(l)}">${l.phone}</a>${salonActions(l, 'location-actions')}</div></article>`).join('')}</div>`;
}
function visitSection() {
  return `<section class="visit-section section wrap" id="locations"><div class="section-heading"><div><p class="eyebrow">Close to home. A world away.</p><h2>Find your <em>little escape.</em></h2></div><p>Three locations. The same welcoming feeling.<br>We look forward to seeing you.</p></div>${locationCards()}<div class="hours-strip"><span>${star} Make time for yourself.</span><p>Mon – Sat <strong>10:00 AM – 08:00 PM</strong></p><p>Sunday <strong>01:00 PM – 06:00 PM</strong></p></div></section>`;
}
// Owner-selected five-star Google reviews, shown word for word; the intro says they are a selection (FTC review rules).
function reviewsSection() {
  const names = Object.fromEntries(locations.map(l => [l.id, l.name]));
  const cards = reviews.map(r => `<figure class="review-card"><p class="review-stars" role="img" aria-label="Rated 5 out of 5 stars">★★★★★</p><blockquote><p>${escape(r.text)}</p></blockquote><figcaption><strong>${escape(r.name)}</strong><span>${escape(names[r.location])} · Google review · ${reviewMonth(r.date)}</span></figcaption></figure>`).join('');
  const sources = locations.map((l, i) => {
    const write = reviewLinks[l.id] || googleMaps(l), read = reviewLinks[l.id]?.replace(/\/review$/, '') || googleMaps(l);
    return `<div class="review-source"><p class="eyebrow">Location ${i + 1} · ${l.city}</p><h3>${l.name}</h3><div class="review-source-links"><a href="${escape(read)}" target="_blank" rel="noopener noreferrer" aria-label="Read all Google reviews for ${escape(l.name)} (opens in a new tab)">Read all reviews <span aria-hidden="true">↗</span></a><a href="${escape(write)}" target="_blank" rel="noopener noreferrer" aria-label="Leave a Google review for ${escape(l.name)} (opens in a new tab)">Leave a review <span aria-hidden="true">↗</span></a></div></div>`;
  }).join('');
  const intro = reviews.length ? 'A selection of five-star reviews from Google, shared word for word.<br>Read every review, or leave your own, below.' : 'See what our guests say about each salon on Google,<br>or leave a review of your own.';
  const list = reviews.length ? `<div class="review-grid">${cards}</div><button class="text-link review-more" type="button" aria-expanded="false" data-label="Show all ${reviews.length} reviews" hidden>Show all ${reviews.length} reviews</button>` : '';
  return `<section class="reviews-section section wrap" id="reviews" aria-labelledby="reviews-title" data-reviews><div class="section-heading"><div><p class="eyebrow">Kind words from our guests</p><h2 id="reviews-title">Loved by our <em>neighbors.</em></h2></div><p>${intro}</p></div>${list}<div class="review-sources"><p class="review-sources-title">Read every review on Google</p>${sources}</div></section>`;
}
function galleryTile(item, classes = '') {
  return `<button class="gallery-tile${classes ? ` ${classes}` : ''}" data-category="${item.category}" data-lightbox="${item.image}" data-caption="${escape(item.alt)}" aria-label="Enlarge: ${escape(item.alt)}"><img src="${item.image}" width="720" height="800" alt="${escape(item.alt)}" loading="lazy"><span class="gallery-zoom" aria-hidden="true">↗</span></button>`;
}
const heroImage = '/images/original/our-gallery-19.jpg';
function inspirationSection() {
  const banner = `<a class="inspiration-slide inspiration-banner" href="/our-gallery" aria-label="Explore the EC Star Nails & Spa gallery"><img src="/images/web/salon-polish-wall-1366.webp" srcset="/images/web/salon-polish-wall-683.webp 683w, /images/web/salon-polish-wall-1366.webp 1366w" sizes="(max-width: 700px) 390px, 720px" width="1366" height="768" alt="The nail polish wall and display cabinets inside EC Star Nails & Spa" loading="lazy"><span class="image-arrow" aria-hidden="true">${arrow}</span></a>`;
  const looks = gallery.filter(item => item.image !== heroImage).slice(0, 10).map(item => galleryTile(item, 'inspiration-slide')).join('');
  return `<section class="gallery-section inspiration-section section" aria-labelledby="home-inspiration-title"><div class="section-heading inspiration-heading wrap"><div><p class="eyebrow">A little inspiration for your next visit</p><h2 id="home-inspiration-title">Beautiful in <em>every detail.</em></h2></div>${button('/our-gallery', 'View our gallery', 'text-link')}</div><div class="inspiration-marquee" data-gallery-marquee><div class="inspiration-track"><div class="gallery-run">${banner}${looks}</div></div></div></section>`;
}
function home() {
  return `<section class="hero"><div class="hero-copy"><h1><span class="eyebrow"><span class="short-line"></span> Nail salon in Greenville &amp;&nbsp;Washington,&nbsp;NC</span><span>Look & Feel<br><em>Beautiful.</em></span></h1><p class="hero-subtitle">Enjoy More, Live Happier</p><p class="hero-description">A moment to unwind. A touch of artistry.<br>A full-service experience designed to make you shine.</p><div class="hero-actions">${button('/services', 'Explore our services')}${button('/contact#locations', 'Find your salon', 'text-link')}</div><div class="hero-footnote">${star}<span>NAIL CARE · SPA PEDICURES · WAXING</span></div></div><div class="hero-photo"><img class="hero-image" src="${heroImage}" width="1080" height="1080" alt="Cream almond manicure with gold glitter accents" fetchpriority="high"><div class="photo-label"><span>A LITTLE BEAUTY, EVERY DAY.</span><span>01 — EC STAR</span></div><a class="hero-photo-link" href="/our-gallery" aria-label="Explore our nail gallery">${arrow}</a></div></section>
  ${inspirationSection()}
  <section class="services-section section wrap">${alias('h.7fp4bsr2gm0o')}<div class="section-heading"><div><p class="eyebrow">Your time. Your treatment.</p><h2>A full-service <em>experience.</em></h2></div>${button('/services', 'Discover the menu', 'text-link')}</div><div class="service-grid">${serviceCategories.map((s, i) => `<article class="service-card">${alias(['h.37yuarhgw5cc', 'h.ttet8krwc7wf', 'h.5pcb2br4s767'][i])}<a class="service-image" href="/services#${s.id}"><img src="${s.image}" width="650" height="576" alt="${s.label}" loading="lazy"><span class="image-arrow">${arrow}</span></a><div class="service-title"><h3><a href="/services#${s.id}">${s.name}</a></h3><span>${s.number}</span></div><p>${s.description}</p></article>`).join('')}</div></section>
  <section class="about-teaser"><div class="about-photo"><img src="/images/salon-interior.jpg" width="1280" height="960" loading="lazy" alt="The welcoming interior of EC Star Nails & Spa"><span class="photo-note">YOUR NEIGHBORHOOD SANCTUARY</span></div><div class="about-copy">${alias('h.v7c9ooq9yagq')}<p class="eyebrow">Welcome to EC Star Nails & Spa</p><h2>Come as you are.<br>Leave feeling <em>like you.</em></h2><p>${introduction[0]}</p><p>${introduction[1]}</p>${button('/about', 'A little more about us', 'text-link')}</div></section>
  <div class="quote-band"><span>${star}</span><p>We believe that you are<br><em>your best accessory.</em></p><span>${star}</span></div>${reviewsSection()}${visitSection()}`;
}
// The eyebrow sits inside the H1 so each page's main heading opens with its search keyword (approved 2026-11-03).
const pageHero = (eyebrow, title, desc) => `<section class="page-hero wrap"><h1><span class="eyebrow">${eyebrow}</span><span>${title}</span></h1><p>${desc}</p>${star}</section>`;
function menuDesign(index) {
  const title = menuSheets[index];
  const image = `/images/original/services-${String(index + 1).padStart(2, '0')}.jpg`;
  const heights = [1778, 1846, 1819, 1825, 1842, 1732, 1859, 1866];
  return `<figure class="menu-sheet"${index === 3 || index === 4 ? ' data-wide' : ''}>
    <figcaption class="product-design-heading"><span>${String(index + 1).padStart(2, '0')}</span><h3>${escape(title)}</h3></figcaption>
    <button class="product-design-image" data-lightbox="${image}" data-zoomable data-caption="${escape(title)}" aria-label="Enlarge: ${escape(title)}">
      <img src="${image}" width="1280" height="${heights[index]}" alt="${escape(title)} — full treatment menu and product designs" loading="lazy">
      <span class="product-design-open">View full-size menu ${arrow}</span>
    </button>
  </figure>`;
}
function services() {
  return `${pageHero('Nail services & prices', 'A little care.<br><em>A beautiful feeling.</em>', 'Explore our full menu of nail care, spa pedicures, and finishing touches.')}
  ${alias('h.9fnyhwopst4j')}
  <div class="service-jumps wrap" aria-label="Service categories"><a href="#original-menu">Spa collections</a>${menus.map(m => `<a href="#${m.id}">${m.name}</a>`).join('')}<a href="#complete-menu">Complete service menu</a><a href="#services-locations">Call & directions</a></div>
  ${serviceLocationCTA()}
  <section class="original-menu spa-collections section wrap" id="original-menu">
    <div class="section-heading"><div><p class="eyebrow">Explore the details</p><h2>Our spa <em>collections.</em></h2></div><p>Discover the products and rituals behind your treatment.<br>Select a menu to take a closer look.</p></div>
    <div class="menu-sheets product-design-grid">${[1, 2, 3, 4].map(menuDesign).join('')}</div>
  </section>
  <section class="menu-section wrap">
    <div class="menu-aside"><p class="eyebrow">List of services</p><h2>Your moment<br> of <em>self-care.</em></h2><p>From your favorite everyday manicure to a relaxing spa pedicure, find the treatment that feels like you.</p><img src="/images/original/home-01.jpg" width="650" height="576" alt="A relaxing manicure treatment" loading="lazy">${button('#services-locations', 'Call or get directions', 'text-link')}</div>
    <div class="menu-list">${menus.map((m, i) => `<section class="menu-group" id="${m.id}"><div class="menu-group-heading"><span class="menu-number">0${i + 1}</span><div><h2>${m.name}</h2><p>${m.subtitle}</p></div></div>${m.description ? `<p class="menu-description">${m.description}</p>` : ''}<table><caption class="sr-only">${m.name} prices</caption><thead><tr>${m.columns.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${m.rows.map(row => `<tr><th scope="row">${escape(row[0])}</th>${row.slice(1).map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`).join('')}</div>
  </section>
  <section class="original-menu section wrap" id="complete-menu">
    <div class="section-heading"><div><p class="eyebrow">A full-service experience</p><h2>More ways to <em>feel beautiful.</em></h2></div><p>Explore our pedicure, nail care, waxing, and head spa menus.<br>Select a menu to see every detail.</p></div>
    <div class="menu-sheets product-design-grid">${[0, 5, 6, 7].map(menuDesign).join('')}</div>
  </section>
  <section class="cta-band"><p class="eyebrow">A little time, just for you</p><h2>Ready to <em>unwind?</em></h2>${button('#services-locations', 'Call or get directions', 'button button-light')}</section>`;
}
function galleryPage() {
  return `${pageHero('Nail art gallery', 'Small details.<br><em>Beautiful possibilities.</em>', 'Find inspiration for your next visit in our collection of colors, shapes, and nail artistry.')}<section class="gallery-full wrap"><h2 class="sr-only">Our Gallery</h2><div class="gallery-toolbar"><div class="gallery-filters" role="group" aria-label="Filter nail gallery"><button data-filter="all" aria-pressed="true">All looks <span>${gallery.length}</span></button><button data-filter="everyday" aria-pressed="false">Everyday elegance</button><button data-filter="color" aria-pressed="false">A little color</button><button data-filter="art" aria-pressed="false">Nail artistry</button></div><p class="gallery-count" aria-live="polite">${gallery.length} looks to inspire you</p></div><div class="gallery-grid">${gallery.map(item => galleryTile(item)).join('')}</div></section><section class="cta-band"><p class="eyebrow">Your next favorite look is waiting</p><h2>Let’s make it <em>yours.</em></h2>${button('/contact#locations', 'Find your salon', 'button button-light')}</section>`;
}
function about() {
  const paragraphs = legacy.about.text.filter(t => t.startsWith('For over a decade,') || t.startsWith('But beyond our history'));
  return `${pageHero('About our nail salons', 'More than a salon.<br><em>Your little sanctuary.</em>', 'Tired of the everyday hustle? Step into your personal sanctuary.')}<section class="about-story wrap"><div class="story-photo"><img src="/images/salon-interior.jpg" width="1280" height="960" alt="Inside our welcoming nail and spa salon" loading="lazy"><div class="story-photo-label"><span>ROOTED IN OUR COMMUNITY</span>${star}</div></div><div class="story-copy"><p class="eyebrow">Our story</p><h2>A decade of care.<br>A place to <em>feel beautiful.</em></h2><p>${escape(paragraphs[0])}</p><p class="signature">EC Star Nails & Spa Mgt</p></div></section><section class="about-invitation"><div class="wrap invitation-inner"><p class="eyebrow">A retreat from the everyday</p><h2>Unwind. Recharge.<br><em>Feel like yourself again.</em></h2><p>${escape(paragraphs[1])}</p>${button('/services', 'Discover your treatment', 'text-link')}</div></section>${visitSection()}`;
}
function contact() {
  return `${pageHero('Nail salons in Greenville &amp;&nbsp;Washington,&nbsp;NC', 'Your moment<br><em>starts here.</em>', 'Choose your nearest salon, give us a call, and let us take care of the rest.')}<section class="contact-intro wrap">${alias('h.iiyzfiog8gja')}${alias('h.hak1h8sc42n7')}<div><p class="eyebrow">Hours & appointments</p><h2>Make a little<br> <em>time for you.</em></h2><p class="contact-note">For appointments, please call your preferred salon below.</p></div><div class="contact-hours"><div><span>Monday – Saturday</span><strong>10:00 AM – 08:00 PM</strong></div><div><span>Sunday</span><strong>01:00 PM – 06:00 PM</strong></div></div></section>${visitSection()}`;
}
const lightbox = `<dialog class="lightbox" aria-label="Gallery image viewer"><button class="lightbox-close" aria-label="Close image viewer">×</button><div class="lightbox-tools" hidden><button class="lightbox-zoom" aria-pressed="false">Zoom to 100%</button><a class="lightbox-original" target="_blank" rel="noopener noreferrer">Open full-size menu ↗</a></div><button class="lightbox-prev" aria-label="Previous image">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-next" aria-label="Next image">→</button><p class="lightbox-position" aria-live="polite"></p></dialog>`;
// Search keywords approved 2026-11-03: titles stay under ~600px (≤ 63 characters), descriptions 120–160 characters (check.mjs).
const titles = { home: 'Nail Salon in Greenville & Washington, NC | EC Star Nails & Spa', services: 'Nail Services & Prices in Greenville, NC | EC Star Nails & Spa', 'our-gallery': 'Nail Art Gallery | EC Star Nails & Spa in Greenville, NC', about: 'About Our Nail Salons | EC Star Nails & Spa, Greenville NC', contact: 'Locations in Greenville & Washington, NC | EC Star Nails & Spa' };
const descriptions = { home: 'EC Star Nails & Spa is a nail salon with three locations in Greenville and Washington, NC. Manicures, gel, dip powder, acrylics, spa pedicures and waxing.', services: 'Prices for manicures, gel and dip powder nails, acrylics, spa pedicures, waxing and kids’ services at EC Star Nails & Spa in Greenville and Washington, NC.', 'our-gallery': 'Browse nail art from EC Star Nails & Spa in Greenville and Washington, NC: ombré, floral, holiday and crystal designs to inspire your next manicure.', about: 'For over a decade, EC Star Nails & Spa has offered nail care and spa treatments. Get to know our nail salons in Greenville and Washington, NC.', contact: 'Addresses, phone numbers and hours for EC Star Nails & Spa’s three nail salons: two in Greenville and one in Washington, NC. Open 7 days. Call to book.' };
function schema(page) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', '@id': `${origin}/#website`, name: 'EC Star Nails & Spa', url: `${origin}/home`, inLanguage: 'en-US' }, { '@type': 'WebPage', '@id': `${origin}/${page}#webpage`, url: `${origin}/${page}`, name: titles[page], description: descriptions[page], isPartOf: { '@id': `${origin}/#website` } }, ...locations.map((l, i) => ({ '@type': 'NailSalon', '@id': `${origin}/contact#${l.id}`, name: `EC Star Nails & Spa — Location ${i + 1}`, url: `${origin}/contact#${l.id}`, image: origin + l.image, telephone: `+1-${l.phone}`, address: { '@type': 'PostalAddress', streetAddress: l.street, addressLocality: l.city, addressRegion: 'NC', postalCode: l.postal, addressCountry: 'US' }, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '20:00' }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '13:00', closes: '18:00' }] }))] }).replaceAll('<', '\\u003c');
}
function layout(page, content, is404 = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${is404 ? 'Page Not Found | EC Star Nails & Spa' : escape(titles[page])}</title><meta name="description" content="${escape(descriptions[page])}"><meta name="theme-color" content="#2b1d31">${is404 ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${origin}/${page}">`}<meta property="og:type" content="website"><meta property="og:title" content="${escape(titles[page])}"><meta property="og:description" content="${escape(descriptions[page])}"><meta property="og:url" content="${origin}/${page}"><meta property="og:image" content="${origin}/images/original/our-gallery-19.jpg"><meta property="og:image:alt" content="Cream almond manicure from EC Star Nails & Spa"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/styles.css"><script src="/site.js" defer></script>${is404 ? '' : `<script type="application/ld+json">${schema(page)}</script>`}</head><body id="top"><a class="skip-link" href="#main">Skip to main content</a>${header(page)}<main id="main">${content}</main>${footer()}${lightbox}</body></html>`;
}
for (const [page, render] of Object.entries({ home, services, 'our-gallery': galleryPage, about, contact })) {
  await writeFile(resolve(dist, `${page}.html`), responsiveImages(layout(page, render())));
}
await writeFile(resolve(dist, '404.html'), layout('home', `<section class="not-found wrap"><p class="eyebrow">A little detour</p><h1>Let’s get you<br><em>somewhere beautiful.</em></h1><p>We couldn’t find that page. Explore our services or find your nearest salon.</p>${button('/home', 'Back to home')}${button('/contact', 'Contact us', 'text-link')}</section>`, true));
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${navigation.map(([path]) => `<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>`);
console.log('Built 5 static pages, 404, sitemap, and local assets in D:/ecnails/dist.');
