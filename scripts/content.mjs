// Reads the site's content folders directly, for the check scripts.
// (Astro's own collections are only available inside the build.)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export const root = new URL('..', import.meta.url).pathname;
const shopDir = join(root, 'src/content/shop');
const blogDir = join(root, 'src/content/blog');

const imageExt = /\.(jpe?g|png|webp|avif|gif|tiff?|heic)$/i;

function frontMatter(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? (parse(match[1]) ?? {}) : {};
}

const folders = (dir) =>
  readdirSync(dir).filter((name) => !name.startsWith('_') && statSync(join(dir, name)).isDirectory());

/** Every shop piece folder that has an index.md. */
export function shopPieces() {
  return folders(shopDir)
    .filter((slug) => existsSync(join(shopDir, slug, 'index.md')))
    .map((slug) => {
      const file = `src/content/shop/${slug}/index.md`;
      const data = frontMatter(join(root, file));
      const images = (data.images ?? []).map((p) => String(p).replace(/^\.\//, ''));
      const photos = readdirSync(join(shopDir, slug)).filter((f) => imageExt.test(f));
      return {
        slug,
        file,
        status: data.status ?? 'available',
        title: data.en?.title ?? data.sv?.title ?? slug,
        images,
        photos,
        shown: images.length > 0,
      };
    });
}

/** Every blog post folder, with the languages it's written in. */
export function blogPosts() {
  return folders(blogDir).map((slug) => ({
    slug,
    dir: `src/content/blog/${slug}`,
    langs: ['sv', 'en'].filter((l) => existsSync(join(blogDir, slug, `${l}.md`))),
  }));
}
