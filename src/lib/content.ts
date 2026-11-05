import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n';

export type Piece = CollectionEntry<'shop'>;

const statusRank = { available: 0, reserved: 1, sold: 2 } as const;

/** Pieces shown in the shop: those with at least one photo. Available first, then reserved, then sold. */
export async function getShopPieces() {
  const all = await getCollection('shop');
  return all
    .filter((p) => p.data.images.length > 0)
    .sort(
      (a, b) =>
        statusRank[a.data.status] - statusRank[b.data.status] || a.data.order - b.data.order,
    );
}

export async function getWorkshops(audience: 'teams' | 'friends') {
  const all = await getCollection('workshops');
  return all.filter((w) => w.data.audience === audience).sort((a, b) => a.data.order - b.data.order);
}

export type Post = {
  slug: string;
  entry: CollectionEntry<'blog'>;
  /** The language the post is actually written in. */
  lang: Lang;
  isFallback: boolean;
  /** Whether the post exists in both languages. */
  translated: boolean;
};

/** Every post, in the requested language when it exists, otherwise in the other one. */
export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('blog');
  const bySlug = new Map<string, Partial<Record<Lang, CollectionEntry<'blog'>>>>();
  for (const entry of all) {
    const [slug, l] = entry.id.split('/') as [string, Lang];
    bySlug.set(slug, { ...bySlug.get(slug), [l]: entry });
  }
  const posts: Post[] = [];
  for (const [slug, versions] of bySlug) {
    const own = versions[lang];
    const other = versions[lang === 'sv' ? 'en' : 'sv'];
    const entry = own ?? other!;
    posts.push({ slug, entry, lang: own ? lang : lang === 'sv' ? 'en' : 'sv', isFallback: !own, translated: Boolean(own && other) });
  }
  return posts.sort((a, b) => a.entry.data.order - b.entry.data.order);
}
