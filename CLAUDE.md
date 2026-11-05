# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The website of **Catherine Brockman / Inkling Lab** (Inkling Lab AB, her textile studio in Stockholm), served at `www.inkling.se` from GitHub Pages. Catherine owns the site and her husband David helps maintain it. She is not a developer and edits content through the GitHub web editor, so keep content files plain and easy to find.

The design and tech were fully reworked (Astro, bilingual) on the `redesign` branch. The old Tooplate template is gone; git history has it if anything needs recovering. Further changes to design and tech are fine.

The site has three audiences, each with its own enquiry form:

- **Group workshops** (mostly companies, plus friend groups): `/workshops/`
- **One-to-one sewing lessons** (cosplay, garments, alterations): `/lektioner/` and `/en/lessons/`
- **Shop** of one-off repaired and embroidered garments, with reservations (payment happens outside the site, by Swish): `/butik/` and `/en/shop/`

Plus a blog (`/blogg/`, `/en/blog/`).

## Commands

```sh
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # static build into dist/
npx astro check   # type check
npm run verify    # everything CI runs: content notes, type check, build, site check
```

`npm run check:content` (`scripts/content-report.mjs`) lists unfinished content, such as shop pieces without photos, photos not listed under `images:`, and blog posts in one language. It only warns and never fails.

`npm run check:site` (`scripts/check-site.mjs`) checks the built `dist/` and fails on problems: broken internal links and `#anchors`, language versions that don't point at each other (switch link, `hreflang`, `canonical`), forms that don't post to Formspree, and reservation forms on pieces that aren't `available`. Run it after `npm run build`.

`npx astro preview` runs as a background daemon in Astro 7 (`astro preview stop` to end it).

On this machine `python3` isn't installed. For headless screenshots, run chromium with `env -u LD_LIBRARY_PATH chromium --headless=new ...`, because the inherited `LD_LIBRARY_PATH` breaks it.

## Deploy

`.github/workflows/deploy.yml` runs the checks above on every push and pull request, and deploys only pushes to `main`. A failed check stops the deploy, and the live site stays as it was. In the repo's Pages settings, the source must be set to **GitHub Actions**. `public/CNAME` keeps the custom domain. `public/workshops.html` and `public/blog.html` redirect the old URLs.

## Architecture

- **Two languages, one page each.** Swedish is at the root and English is under `/en/`. Page addresses are defined in `src/i18n.ts` (`routes`), together with shared interface strings (`ui`). Each page's own text lives in a `copy = { sv, en }` object at the top of its view in `src/views/`. The files in `src/pages/` are thin wrappers that pass `lang` to a view, so adding a page means adding a view, two route files, and an entry in `routes`. Every page passes its other-language address to `Base` as `alternate`, which drives both the SV/EN switch and the `hreflang` tags.
- **Content collections** are defined in `src/content.config.ts`:
  - `shop/<slug>/index.md` holds the piece's photos beside it. Facts shared by both languages (status, price, size, images) sit at the top level, and texts sit under `sv:` and `en:`. A piece only appears in the shop once it has at least one image. `status` is `available`, `reserved` or `sold`, and the reservation form only renders for `available` pieces.
  - `workshops/*.md` uses frontmatter only, with `audience: teams | friends`.
  - `blog/<slug>/{sv,en}.md`. A post that exists in one language is shown in that language on both sites, and its fallback page sets `canonical` to the original. Neither page emits `hreflang`, since there is no translation (see `canonicalPath` and `hreflang` in `Base.astro`).
- **Forms**: all three use `src/components/EnquiryForm.astro`, which posts to the single Formspree endpoint in `src/config.ts`. A hidden `form` field tells them apart. It works without JS, and with JS it submits via fetch and shows an inline confirmation. Formspree's free plan has no file uploads, so the forms ask for links instead.
- **Visual system** (in `src/styles/global.css`): taken from Catherine's business card (`design/business-card.jpg`). Colours are indigo, white thread and cobalt, plus madder red used only for shop status. Type is Montserrat for the name, menu, headings and UI, and Literata for running text. Links have a dashed "running stitch" underline. `SashikoBand.astro` draws the indigo sashiko band as SVG. Its seams sew themselves in once on the home page, and that's the site's only animation; keep it that way. Tracked capitals appear only in the name lockup and the menu, echoing the card.
- Images go through `astro:assets`. Put site photos in `src/assets/` and shop photos in the piece's folder. Photos waiting to be matched to a piece go in `src/content/shop/_unsorted-photos/`.
