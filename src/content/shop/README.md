# Shop pieces

Each piece has its own folder. The folder name is the piece's web address
(`/butik/golden-haven/` and `/en/shop/golden-haven/`), so use lowercase and dashes.

To add a piece:

1. Copy an existing folder, e.g. `golden-haven`, and rename it.
2. Put the photos in the folder. The first photo listed is the one shown in the shop.
3. Edit `index.md`: status, price, size, and the Swedish and English texts.

A piece appears in the shop once it has at least one photo.

To mark a piece reserved or sold, change `status:` to `reserved` or `sold`.
Sold pieces stay on the site, marked as sold, with the reservation form removed.

`_unsorted-photos/` holds photos that don't belong to a piece yet. Nothing in it is shown on the site.
