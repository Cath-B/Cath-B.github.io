// Checks the built site in dist/ (run `npm run build` first, then `npm run check:site`):
//   - every internal link, image, script and #anchor points at something that exists
//   - each page and its other-language version point at each other (language switch, hreflang, canonical)
//   - forms post to the Formspree endpoint, and the reservation form appears only on available pieces
// Exits with an error listing every problem found.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { root, shopPieces } from './content.mjs';

const dist = join(root, 'dist');
const site = new URL(readFileSync(join(root, 'astro.config.mjs'), 'utf8').match(/site:\s*'([^']+)'/)[1]);
const siteHosts = new Set([site.host, site.host.replace(/^www\./, '')]);
const formspree = readFileSync(join(root, 'src/config.ts'), 'utf8').match(/FORMSPREE_ENDPOINT\s*=\s*'([^']+)'/)[1];

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const errors = [];
const fail = (page, text) => errors.push(`${page}: ${text}`);

// ---- Reading the HTML ----

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Every tag with its attributes. Script and style contents are skipped. */
function tags(html) {
  const out = [];
  const stripped = html.replace(/(<(script|style)\b[^>]*>)[\s\S]*?<\/\2>/gi, '$1').replace(/<!--[\s\S]*?-->/g, '');
  for (const [, name, rest] of stripped.matchAll(/<([a-zA-Z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const attrs = {};
    for (const [, key, , dq, sq, bare] of rest.matchAll(/([^\s=/>]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[key.toLowerCase()] = decode(dq ?? sq ?? bare ?? '');
    }
    out.push({ name: name.toLowerCase(), attrs });
  }
  return out;
}

const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[e]);

/** The address a file in dist/ is served at. */
const urlPath = (file) => '/' + relative(dist, file).replace(/(^|\/)index\.html$/, '$1');

const pages = new Map();
for (const file of walk(dist).filter((f) => f.endsWith('.html'))) {
  const path = urlPath(file);
  const list = tags(readFileSync(file, 'utf8'));
  const find = (name, test = () => true) => list.find((t) => t.name === name && test(t.attrs));
  const all = (name, test = () => true) => list.filter((t) => t.name === name && test(t.attrs)).map((t) => t.attrs);
  pages.set(path, {
    path,
    tags: list,
    find,
    all,
    ids: new Set(list.flatMap((t) => [t.attrs.id, t.name === 'a' ? t.attrs.name : undefined]).filter(Boolean)),
    redirect: Boolean(find('meta', (a) => a['http-equiv']?.toLowerCase() === 'refresh')),
  });
}

/** Finds the page or file a URL points at, the way GitHub Pages would serve it. */
function resolve(pathname) {
  let p;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const candidates = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
  for (const c of candidates) {
    const file = join(dist, c);
    if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return urlPath(file);
  }
  return undefined;
}

/** Parses a URL found on `page`. Returns undefined for external and non-web links. */
function internal(raw, page) {
  if (!raw || /^(mailto|tel|javascript|data|sms):/i.test(raw)) return undefined;
  const url = new URL(raw, new URL(page, site));
  if (!/^https?:$/.test(url.protocol) || !siteHosts.has(url.host)) return undefined;
  return url;
}

// ---- 1. Links ----

const refAttrs = { a: ['href'], link: ['href'], img: ['src', 'srcset'], source: ['src', 'srcset'], script: ['src'], iframe: ['src'], video: ['src', 'poster'], audio: ['src'] };
const metaUrls = new Set(['og:image', 'og:url', 'twitter:image']);

for (const page of pages.values()) {
  const refs = [];
  for (const { name, attrs } of page.tags) {
    for (const attr of refAttrs[name] ?? []) {
      if (!attrs[attr]) continue;
      if (attr === 'srcset') refs.push(...attrs.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean));
      else refs.push(attrs[attr]);
    }
    if (name === 'meta' && metaUrls.has(attrs.property ?? attrs.name)) refs.push(attrs.content);
    if (name === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh') {
      const m = attrs.content?.match(/url=(.+)$/i);
      if (m) refs.push(m[1].trim());
    }
  }
  for (const ref of refs) {
    const url = internal(ref, page.path);
    if (!url) continue;
    const target = resolve(url.pathname);
    if (!target) {
      fail(page.path, `broken link to ${ref}`);
      continue;
    }
    const hash = decodeURIComponent(url.hash.slice(1));
    if (hash && pages.has(target) && !pages.get(target).ids.has(hash)) {
      fail(page.path, `link to ${ref}, but ${target} has no element with id="${hash}"`);
    }
  }
}

// ---- 2. Language versions ----

const absolute = (path) => new URL(path, site).href;
const ownPath = (href) => {
  const url = internal(href, '/');
  return url ? resolve(url.pathname) : undefined;
};

/** What a page says about its language versions. */
function langInfo(page) {
  const canonical = page.find('link', (a) => a.rel === 'canonical')?.attrs.href;
  const hreflang = Object.fromEntries(page.all('link', (a) => a.rel === 'alternate' && a.hreflang).map((a) => [a.hreflang, a.href]));
  const switchHref = page.find('a', (a) => a.class?.split(/\s+/).includes('lang'))?.attrs.href;
  return {
    lang: page.find('html')?.attrs.lang,
    canonical,
    canonicalPath: canonical && ownPath(canonical),
    hreflang,
    switchPath: switchHref && ownPath(switchHref),
    switchHref,
  };
}

const contentPages = [...pages.values()].filter((p) => !p.redirect && p.path !== '/404.html');

const notFound = pages.get('/404.html');
if (!notFound) fail('/404.html', 'missing from the build');
else if (notFound.find('link', (a) => a.rel === 'canonical' || a.rel === 'alternate') || !notFound.find('meta', (a) => a.name === 'robots' && a.content.includes('noindex'))) {
  fail('/404.html', 'should be noindex, without canonical or hreflang links');
}

for (const page of contentPages) {
  const own = langInfo(page);
  const expected = page.path.startsWith('/en/') ? 'en' : 'sv';
  const other = expected === 'sv' ? 'en' : 'sv';

  if (own.lang !== expected) fail(page.path, `<html lang="${own.lang}"> should be "${expected}"`);
  if (!page.find('title')) fail(page.path, 'missing <title>');
  if (!page.find('meta', (a) => a.name === 'description' && a.content?.trim())) fail(page.path, 'missing meta description');

  if (!own.switchHref) {
    fail(page.path, 'no language switch link');
    continue;
  }
  const alt = pages.get(own.switchPath);
  if (!alt) continue; // already reported as a broken link
  const theirs = langInfo(alt);
  if (theirs.switchPath !== page.path) {
    fail(page.path, `language switch goes to ${alt.path}, but that page's switch goes to ${theirs.switchHref}, not back here`);
  }

  if (!own.canonical || !own.canonical.startsWith(site.origin + '/')) {
    fail(page.path, `canonical should be a full ${site.origin}/… address, found ${own.canonical}`);
    continue;
  }
  const hasHreflang = Object.keys(own.hreflang).length > 0;

  if (own.canonicalPath !== page.path) {
    // A fallback page: content from the other language, pointing search engines at the original.
    if (hasHreflang) fail(page.path, 'has a canonical pointing elsewhere, so it should have no hreflang links');
    if (own.canonicalPath !== alt.path) fail(page.path, `canonical ${own.canonical} should be its other-language version ${absolute(alt.path)}`);
    if (theirs.canonicalPath !== alt.path) fail(page.path, `canonical points at ${alt.path}, which itself isn't canonical`);
    continue;
  }

  const altIsFallback = theirs.canonicalPath === page.path;
  if (altIsFallback) {
    if (hasHreflang) fail(page.path, `has hreflang links, but ${alt.path} isn't a translation (its canonical points back here)`);
    continue;
  }
  if (!hasHreflang) {
    fail(page.path, `no hreflang links, though ${alt.path} is its translation`);
    continue;
  }
  const want = { [expected]: absolute(page.path), [other]: absolute(alt.path), 'x-default': absolute(expected === 'sv' ? page.path : alt.path) };
  for (const [key, href] of Object.entries(want)) {
    if (own.hreflang[key] !== href) fail(page.path, `hreflang="${key}" should be ${href}, found ${own.hreflang[key]}`);
  }
  for (const key of Object.keys(own.hreflang)) {
    if (!(key in want)) fail(page.path, `unexpected hreflang="${key}"`);
  }
}

// ---- 3. Forms and shop pieces ----

const field = (form, page, name) => {
  // The tag list has no closing tags, so a form's fields are the inputs between it and the next <form>.
  const start = page.tags.indexOf(form);
  const next = page.tags.findIndex((t, i) => i > start && t.name === 'form');
  return page.tags
    .slice(start + 1, next === -1 ? undefined : next)
    .find((t) => t.name === 'input' && t.attrs.name === name)?.attrs;
};

const formsOn = (page) =>
  page.tags.filter((t) => t.name === 'form').map((form) => ({ form, type: field(form, page, 'form')?.value }));

for (const page of pages.values()) {
  for (const { form, type } of formsOn(page)) {
    const { action, method } = form.attrs;
    if (action !== formspree) fail(page.path, `form posts to ${action}, not the Formspree endpoint in src/config.ts`);
    if (method?.toUpperCase() !== 'POST') fail(page.path, `form method is ${method}, should be POST`);
    if (!type) fail(page.path, 'form has no hidden "form" field, so its messages can\'t be told apart');
    if (!field(form, page, '_gotcha')) fail(page.path, 'form is missing the _gotcha spam trap');
  }
}

const expectForm = (path, type, present = true) => {
  const page = pages.get(path);
  if (!page) return fail(path, 'page is missing from the build');
  const found = formsOn(page).some((f) => f.type === type);
  if (found !== present) fail(path, present ? `should have the "${type}" form` : `shouldn't have the "${type}" form`);
};
for (const path of ['/workshops/', '/en/workshops/']) expectForm(path, 'group-workshop');
for (const path of ['/lektioner/', '/en/lessons/']) expectForm(path, 'lessons');

for (const piece of shopPieces()) {
  for (const [shopIndex, path] of [['/butik/', `/butik/${piece.slug}/`], ['/en/shop/', `/en/shop/${piece.slug}/`]]) {
    const listed = pages.get(shopIndex)?.all('a').some((a) => internal(a.href, shopIndex)?.pathname === path);
    if (!piece.shown) {
      if (pages.has(path)) fail(path, `${piece.slug} has no photos, so it shouldn't have a page`);
      continue;
    }
    if (!listed) fail(shopIndex, `doesn't link to ${piece.slug}`);
    expectForm(path, 'shop-reservation', piece.status === 'available');
  }
}

// ---- Report ----

if (errors.length) {
  console.error(`✗ ${errors.length} problem${errors.length === 1 ? '' : 's'} in the built site:\n`);
  for (const e of errors) console.error(process.env.GITHUB_ACTIONS ? `::error title=Site check::${e}` : `  ${e}`);
  process.exit(1);
}
console.log(`✓ Checked ${pages.size} pages: links, language versions, forms and shop pieces are all fine.`);
