// Lists things in the content folders that are probably unfinished, without failing the build.
// Run with `npm run check:content`. On GitHub the notes also appear on the workflow run's page.

import { appendFileSync } from 'node:fs';
import { shopPieces, blogPosts } from './content.mjs';

const notes = [];
const note = (level, file, text) => notes.push({ level, file, text });

for (const piece of shopPieces()) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(piece.slug)) {
    note('warning', piece.file, `The folder name "${piece.slug}" becomes the web address. Use only lowercase letters, numbers and dashes.`);
  }
  if (!piece.shown) {
    note(
      'warning',
      piece.file,
      piece.photos.length
        ? `"${piece.title}" has photos in its folder but none listed under images:, so it isn't shown in the shop.`
        : `"${piece.title}" has no photos yet, so it isn't shown in the shop.`,
    );
  }
  const unlisted = piece.photos.filter((p) => !piece.images.includes(p));
  if (piece.shown && unlisted.length) {
    note('warning', piece.file, `"${piece.title}" has photos in its folder that aren't listed under images:, so they aren't shown (${unlisted.join(', ')}).`);
  }
}

for (const post of blogPosts()) {
  if (post.langs.length === 0) {
    note('warning', post.dir, `The blog folder "${post.slug}" has no sv.md or en.md, so nothing is shown.`);
  } else if (post.langs.length === 1) {
    const [only] = post.langs;
    note('notice', `${post.dir}/${only}.md`, `"${post.slug}" is only written in ${only === 'sv' ? 'Swedish' : 'English'}, so both sites show that version.`);
  }
}

const github = Boolean(process.env.GITHUB_ACTIONS);
for (const { level, file, text } of notes) {
  if (github) console.log(`::${level} file=${file},title=Content::${text}`);
  else console.log(`${level === 'warning' ? '⚠' : 'ℹ'}  ${text}\n   ${file}`);
}
if (!notes.length) console.log('Content looks complete.');

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = notes.length
    ? ['### Content notes', '', 'These don\'t stop the site from publishing.', '', ...notes.map((n) => `- ${n.text} (\`${n.file}\`)`)]
    : ['### Content notes', '', 'Content looks complete.'];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}
