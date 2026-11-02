import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { origin, email, navigation, locations, introduction, serviceCategories, menus, menuSheets, gallery } from '../src/data.mjs';
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
const star = '<svg class="star" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m20 1 4.5 14.5L39 20l-14.5 4.5L20 39l-4.5-14.5L1 20l14.5-4.5Z" stroke="currentColor"/></svg>';
const alias = id => `<span class="legacy-anchor" id="${id}" aria-hidden="true"></span>`;
const phone = location => `tel:+1${location.phone.replaceAll('-', '')}`;
const directions = location => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
const logo = `<span class="brand-name">EC <span class="brand-star">★</span> NAILS</span><span class="brand-sub">& SPA · NORTH CAROLINA</span>`;
const button = (href, text, cls = 'button') => `<a class="${cls}" href="${href}">${text}${arrow}</a>`;
function header(page) {
  return `<div class="announcement"><span>A little time for yourself. A beautiful feeling.</span><a href="/contact#locations">${pin} Greenville & Washington, NC</a></div>
    <header class="site-header"><div class="header-inner"><a href="/home" class="brand" aria-label="EC Star Nails & Spa home">${logo}</a><nav class="desktop-nav" aria-label="Main navigation">${navigation.map(([slug, label]) => `<a href="/${slug}" ${page === slug ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><a class="button header-visit" href="/contact#locations">Plan your visit${arrow}</a><button class="menu-toggle" aria-label="Open navigation" aria-controls="mobile-nav" aria-expanded="false"><span></span><span></span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${navigation.map(([slug, label]) => `<a href="/${slug}" ${page === slug ? 'aria-current="page"' : ''}>${label}${arrow}</a>`).join('')}<a href="/contact#locations">Plan your visit${arrow}</a></nav></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="footer-top wrap"><div class="footer-brand"><a href="/home" class="brand">${logo}</a><p>Your local escape for beauty,<br>tranquility, and a little time for you.</p></div><div class="footer-links"><p class="eyebrow">Explore</p>${navigation.map(([slug, label]) => `<a href="/${slug}">${label}</a>`).join('')}</div><div class="footer-hours"><p class="eyebrow">Open hours</p><p>Monday – Saturday<br><span>10:00 AM – 08:00 PM</span></p><p>Sunday<br><span>01:00 PM – 06:00 PM</span></p><a href="mailto:${email}">Email us ${arrow}</a></div></div><div class="footer-locations wrap">${locations.map((l, i) => `<div>${alias(['h.cm7d2p78gatg', 'h.ccwucn3dnk6k', 'h.cbymgpyv2biw'][i])}<p class="eyebrow">Location ${i + 1} · ${l.city}</p><a href="${directions(l)}" target="_blank" rel="noopener noreferrer">${escape(l.address)}</a><a class="footer-phone" href="${phone(l)}">${l.phone}</a></div>`).join('')}</div><div class="footer-bottom wrap"><span>© ${new Date().getFullYear()} EC Star Nails & Spa. All rights reserved.</span><a href="#top">Back to top ↑</a></div></footer>`;
}
function locationCards() {
  return `<div class="location-grid">${locations.map((l, i) => `<article class="location-card" id="${l.id}"><div class="location-image"><img src="${l.image}" width="578" height="578" alt="Location ${i + 1} storefront on ${l.name}, ${l.city}" loading="lazy"><span>0${i + 1} / ${l.city}</span></div><div class="location-content"><p class="eyebrow">${l.city}, North Carolina</p><h3>${l.name}</h3><address>${escape(l.address)}</address><a class="location-phone" href="${phone(l)}">${l.phone}</a><div class="location-actions"><a href="${phone(l)}">Call the salon ${arrow}</a><a href="${directions(l)}" target="_blank" rel="noopener noreferrer">Directions ${pin}</a></div></div></article>`).join('')}</div>`;
}
function visitSection() {
  return `<section class="visit-section section wrap" id="locations"><div class="section-heading"><div><p class="eyebrow">Close to home. A world away.</p><h2>Find your <em>little escape.</em></h2></div><p>Three locations. The same welcoming feeling.<br>We look forward to seeing you.</p></div>${locationCards()}<div class="hours-strip"><span>${star} Make time for yourself.</span><p>Mon – Sat <strong>10:00 AM – 08:00 PM</strong></p><p>Sunday <strong>01:00 PM – 06:00 PM</strong></p></div></section>`;
}
function galleryTile(item, i) {
  return `<button class="gallery-tile" data-category="${item.category}" data-lightbox="${item.image}" data-caption="${escape(item.alt)}" aria-label="Enlarge: ${escape(item.alt)}"><img src="${item.image}" width="720" height="800" alt="${escape(item.alt)}" loading="lazy"><span class="gallery-zoom" aria-hidden="true">↗</span><span class="gallery-caption">${String(i + 1).padStart(2, '0')} / The details make the difference</span></button>`;
}
function home() {
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="short-line"></span> EC Star Nails & Spa</p><h1>Look & Feel<br><em>Beautiful.</em></h1><p class="hero-subtitle">Enjoy More, Live Happier</p><p class="hero-description">A moment to unwind. A touch of artistry.<br>A full-service experience designed to make you shine.</p><div class="hero-actions">${button('/services', 'Explore our services')}${button('/contact#locations', 'Find your salon', 'text-link')}</div><div class="hero-footnote">${star}<span>NAIL CARE · SPA PEDICURES · WAXING</span></div></div><div class="hero-photo"><img class="hero-image" src="/images/hero-french-manicure.jpg" width="960" height="960" alt="Soft pink French manicure with crisp white tips" fetchpriority="high"><div class="photo-label"><span>A LITTLE BEAUTY, EVERY DAY.</span><span>01 — EC STAR</span></div><a class="hero-photo-link" href="/our-gallery" aria-label="Explore our nail gallery">${arrow}</a></div><div class="hero-index"><span>BEAUTY IN EVERY DETAIL</span><span>SCROLL TO DISCOVER ↓</span></div></section>
  <section class="services-section section wrap">${alias('h.7fp4bsr2gm0o')}<div class="section-heading"><div><p class="eyebrow">Your time. Your treatment.</p><h2>A full-service <em>experience.</em></h2></div>${button('/services', 'Discover the menu', 'text-link')}</div><div class="service-grid">${serviceCategories.map((s, i) => `<article class="service-card">${alias(['h.37yuarhgw5cc', 'h.ttet8krwc7wf', 'h.5pcb2br4s767'][i])}<a class="service-image" href="/services#${s.id}"><img src="${s.image}" width="650" height="576" alt="${s.label}" loading="lazy"><span class="image-arrow">${arrow}</span></a><div class="service-title"><h3><a href="/services#${s.id}">${s.name}</a></h3><span>${s.number}</span></div><p>${s.description}</p></article>`).join('')}</div></section>
  <section class="about-teaser"><div class="about-photo"><img src="/images/salon-interior.jpg" width="1280" height="960" loading="lazy" alt="The welcoming interior of EC Star Nails & Spa"><span class="photo-note">YOUR NEIGHBORHOOD SANCTUARY</span></div><div class="about-copy">${alias('h.v7c9ooq9yagq')}<p class="eyebrow">Welcome to EC Star Nails & Spa</p><h2>Come as you are.<br>Leave feeling <em>like you.</em></h2><p>${introduction[0]}</p><p>${introduction[1]}</p>${button('/about', 'A little more about us', 'text-link')}</div></section>
  <section class="gallery-section section wrap"><div class="section-heading"><div><p class="eyebrow">A little inspiration for your next visit</p><h2>Beautiful in <em>every detail.</em></h2></div>${button('/our-gallery', 'View our gallery', 'text-link')}</div><div class="gallery-preview">${[gallery[0], gallery[3], gallery[2], gallery[5]].map(galleryTile).join('')}</div></section>
  <div class="quote-band"><span>${star}</span><p>We believe that you are<br><em>your best accessory.</em></p><span>${star}</span></div>${visitSection()}`;
}
const pageHero = (eyebrow, title, desc) => `<section class="page-hero wrap"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${desc}</p>${star}</section>`;
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
  return `${pageHero('Care, crafted around you', 'A little care.<br><em>A beautiful feeling.</em>', 'Explore our full menu of nail care, spa pedicures, and finishing touches.')}
  ${alias('h.9fnyhwopst4j')}
  <div class="service-jumps wrap" aria-label="Service categories"><a href="#original-menu">Spa collections</a>${menus.map(m => `<a href="#${m.id}">${m.name}</a>`).join('')}<a href="#complete-menu">Complete service menu</a></div>
  <section class="original-menu spa-collections section wrap" id="original-menu">
    <div class="section-heading"><div><p class="eyebrow">Explore the details</p><h2>Our spa <em>collections.</em></h2></div><p>Discover the products and rituals behind your treatment.<br>Select a menu to take a closer look.</p></div>
    <div class="menu-sheets product-design-grid">${[1, 2, 3, 4].map(menuDesign).join('')}</div>
  </section>
  <section class="menu-section wrap">
    <div class="menu-aside"><p class="eyebrow">List of services</p><h2>Your moment<br>of <em>self-care.</em></h2><p>From your favorite everyday manicure to a relaxing spa pedicure, find the treatment that feels like you.</p><img src="/images/original/home-01.jpg" width="650" height="576" alt="A relaxing manicure treatment" loading="lazy">${button('/contact#locations', 'Find your salon', 'text-link')}</div>
    <div class="menu-list">${menus.map((m, i) => `<section class="menu-group" id="${m.id}"><div class="menu-group-heading"><span class="menu-number">0${i + 1}</span><div><h2>${m.name}</h2><p>${m.subtitle}</p></div></div>${m.description ? `<p class="menu-description">${m.description}</p>` : ''}<table><caption class="sr-only">${m.name} prices</caption><thead><tr>${m.columns.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${m.rows.map(row => `<tr><th scope="row">${escape(row[0])}</th>${row.slice(1).map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`).join('')}</div>
  </section>
  <section class="original-menu section wrap" id="complete-menu">
    <div class="section-heading"><div><p class="eyebrow">A full-service experience</p><h2>More ways to <em>feel beautiful.</em></h2></div><p>Explore our pedicure, nail care, waxing, and head spa menus.<br>Select a menu to see every detail.</p></div>
    <div class="menu-sheets product-design-grid">${[0, 5, 6, 7].map(menuDesign).join('')}</div>
  </section>
  <section class="cta-band"><p class="eyebrow">A little time, just for you</p><h2>Ready to <em>unwind?</em></h2>${button('/contact#locations', 'Plan your visit', 'button button-light')}</section>`;
}
function galleryPage() {
  return `${pageHero('The art of being you', 'Small details.<br><em>Beautiful possibilities.</em>', 'Find inspiration for your next visit in our collection of colors, shapes, and nail artistry.')}<section class="gallery-full wrap"><h2 class="sr-only">Our Gallery</h2><div class="gallery-toolbar"><div class="gallery-filters" role="group" aria-label="Filter nail gallery"><button data-filter="all" aria-pressed="true">All looks <span>${gallery.length}</span></button><button data-filter="everyday" aria-pressed="false">Everyday elegance</button><button data-filter="color" aria-pressed="false">A little color</button><button data-filter="art" aria-pressed="false">Nail artistry</button></div><p class="gallery-count" aria-live="polite">${gallery.length} looks to inspire you</p></div><div class="gallery-grid">${gallery.map(galleryTile).join('')}</div></section><section class="cta-band"><p class="eyebrow">Your next favorite look is waiting</p><h2>Let’s make it <em>yours.</em></h2>${button('/contact#locations', 'Find your salon', 'button button-light')}</section>`;
}
function about() {
  const paragraphs = legacy.about.text.filter(t => t.startsWith('For over a decade,') || t.startsWith('But beyond our history'));
  return `${pageHero('About EC Star Nails & Spa', 'More than a salon.<br><em>Your little sanctuary.</em>', 'Tired of the everyday hustle? Step into your personal sanctuary.')}<section class="about-story wrap"><div class="story-photo"><img src="/images/salon-interior.jpg" width="1280" height="960" alt="Inside our welcoming nail and spa salon" loading="lazy"><div class="story-photo-label"><span>ROOTED IN OUR COMMUNITY</span>${star}</div></div><div class="story-copy"><p class="eyebrow">Our story</p><h2>A decade of care.<br>A place to <em>feel beautiful.</em></h2><p>${escape(paragraphs[0])}</p><p class="signature">EC Star Nails & Spa Mgt</p></div></section><section class="about-invitation"><div class="wrap invitation-inner"><p class="eyebrow">A retreat from the everyday</p><h2>Unwind. Recharge.<br><em>Feel like yourself again.</em></h2><p>${escape(paragraphs[1])}</p>${button('/services', 'Discover your treatment', 'text-link')}</div></section>${visitSection()}`;
}
function contact() {
  return `${pageHero('We look forward to welcoming you', 'Your moment<br><em>starts here.</em>', 'Choose your nearest salon, give us a call, and let us take care of the rest.')}<section class="contact-intro wrap">${alias('h.iiyzfiog8gja')}<div><p class="eyebrow">Hours & appointments</p><h2>Make a little<br><em>time for you.</em></h2></div><div class="contact-hours"><div><span>Monday – Saturday</span><strong>10:00 AM – 08:00 PM</strong></div><div><span>Sunday</span><strong>01:00 PM – 06:00 PM</strong></div></div><div class="contact-email">${alias('h.hak1h8sc42n7')}<p class="eyebrow">Say hello</p><a href="mailto:${email}">${email}${arrow}</a><p>For appointments, please call your preferred salon below.</p></div></section>${visitSection()}`;
}
const lightbox = `<dialog class="lightbox" aria-label="Gallery image viewer"><button class="lightbox-close" aria-label="Close image viewer">×</button><div class="lightbox-tools" hidden><button class="lightbox-zoom" aria-pressed="false">Zoom to 100%</button><a class="lightbox-original" target="_blank" rel="noopener noreferrer">Open full-size menu ↗</a></div><button class="lightbox-prev" aria-label="Previous image">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-next" aria-label="Next image">→</button><p class="lightbox-position" aria-live="polite"></p></dialog>`;
const titles = { home: 'EC Star Nails & Spa | Greenville & Washington, NC', services: 'Services & Prices | EC Star Nails & Spa', 'our-gallery': 'Our Gallery | EC Star Nails & Spa', about: 'About Us | EC Star Nails & Spa', contact: 'Contact & Locations | EC Star Nails & Spa' };
const descriptions = { home: 'Look & Feel Beautiful at EC Star Nails & Spa. Manicures, spa pedicures, and professional waxing at three locations in Greenville and Washington, North Carolina.', services: 'Explore manicure, nail enhancement, dipping powder, pedicure, waxing, and children’s services at EC Star Nails & Spa. View the complete salon menu.', 'our-gallery': 'Explore the EC Star Nails & Spa gallery. Discover elegant manicures, colorful nail designs, and detailed nail artistry for your next visit.', about: 'Discover EC Star Nails & Spa, your neighborhood sanctuary for nail care, relaxing pedicures, and self-care in Greenville and Washington, North Carolina.', contact: 'Visit EC Star Nails & Spa at our three locations in Greenville and Washington, NC. Find phone numbers, directions, opening hours, and appointment information.' };
function schema(page) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', '@id': `${origin}/#website`, name: 'EC Star Nails & Spa', url: `${origin}/home`, inLanguage: 'en-US' }, { '@type': 'WebPage', '@id': `${origin}/${page}#webpage`, url: `${origin}/${page}`, name: titles[page], description: descriptions[page], isPartOf: { '@id': `${origin}/#website` } }, ...locations.map((l, i) => ({ '@type': 'NailSalon', '@id': `${origin}/contact#${l.id}`, name: `EC Star Nails & Spa — Location ${i + 1}`, url: `${origin}/contact#${l.id}`, image: origin + l.image, telephone: `+1-${l.phone}`, email, address: { '@type': 'PostalAddress', streetAddress: l.street, addressLocality: l.city, addressRegion: 'NC', postalCode: l.postal, addressCountry: 'US' }, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '20:00' }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '13:00', closes: '18:00' }] }))] }).replaceAll('<', '\\u003c');
}
function layout(page, content, is404 = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${is404 ? 'Page Not Found | EC Star Nails & Spa' : escape(titles[page])}</title><meta name="description" content="${escape(descriptions[page])}"><meta name="theme-color" content="#2b1d31">${is404 ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${origin}/${page}">`}<meta property="og:type" content="website"><meta property="og:title" content="${escape(titles[page])}"><meta property="og:description" content="${escape(descriptions[page])}"><meta property="og:url" content="${origin}/${page}"><meta property="og:image" content="${origin}/images/hero-french-manicure.jpg"><meta property="og:image:alt" content="Soft pink French manicure from EC Star Nails & Spa"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/styles.css"><script src="/site.js" defer></script>${is404 ? '' : `<script type="application/ld+json">${schema(page)}</script>`}</head><body id="top"><a class="skip-link" href="#main">Skip to main content</a>${header(page)}<main id="main">${content}</main>${footer()}${lightbox}</body></html>`;
}
for (const [page, render] of Object.entries({ home, services, 'our-gallery': galleryPage, about, contact })) {
  await writeFile(resolve(dist, `${page}.html`), responsiveImages(layout(page, render())));
}
await writeFile(resolve(dist, '404.html'), layout('home', `<section class="not-found wrap"><p class="eyebrow">A little detour</p><h1>Let’s get you<br><em>somewhere beautiful.</em></h1><p>We couldn’t find that page. Explore our services or find your nearest salon.</p>${button('/home', 'Back to home')}${button('/contact', 'Contact us', 'text-link')}</section>`, true));
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${navigation.map(([path]) => `<url><loc>${origin}/${path}</loc></url>`).join('')}</urlset>`);
console.log('Built 5 static pages, 404, sitemap, and local assets in D:/ecnails/dist.');
