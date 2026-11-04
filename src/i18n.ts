// Languages, page addresses, and the short interface texts shared by every page.
// Swedish lives at the root (/), English under /en/.

export type Lang = 'sv' | 'en';
export const langs: Lang[] = ['sv', 'en'];

export const routes = {
  home: { sv: '/', en: '/en/' },
  workshops: { sv: '/workshops/', en: '/en/workshops/' },
  lessons: { sv: '/lektioner/', en: '/en/lessons/' },
  shop: { sv: '/butik/', en: '/en/shop/' },
  blog: { sv: '/blogg/', en: '/en/blog/' },
} as const;

export type PageKey = keyof typeof routes;

export const otherLang = (lang: Lang): Lang => (lang === 'sv' ? 'en' : 'sv');
export const pieceUrl = (lang: Lang, slug: string) => `${routes.shop[lang]}${slug}/`;
export const postUrl = (lang: Lang, slug: string) => `${routes.blog[lang]}${slug}/`;

export const ui = {
  sv: {
    langName: 'Svenska',
    switchTo: 'In English',
    nav: { workshops: 'Workshops', lessons: 'Lektioner', shop: 'Butik', blog: 'Blogg' },
    navLabel: 'Huvudmeny',
    studio: 'Inkling Lab',
    footerAbout: 'Inkling Lab AB är Catherine Brockmans textilstudio i Stockholm.',
    footerFind: 'Hitta mig',
    skip: 'Hoppa till innehållet',
    required: 'obligatoriskt',
    optional: 'valfritt',
    sending: 'Skickar…',
    sendError:
      'Formuläret kunde inte skickas. Kontrollera anslutningen och försök igen, eller mejla catherine@inkling.se.',
    status: { available: 'Tillgänglig', reserved: 'Reserverad', sold: 'Såld' },
    priceOnRequest: 'Pris på förfrågan',
    currency: (n: number) => `${n.toLocaleString('sv-SE')}\u00a0kr`,
    fallbackNotice: 'Det här inlägget finns bara på engelska än så länge.',
    readMore: 'Läs inlägget',
  },
  en: {
    langName: 'English',
    switchTo: 'På svenska',
    nav: { workshops: 'Workshops', lessons: 'Lessons', shop: 'Shop', blog: 'Blog' },
    navLabel: 'Main menu',
    studio: 'Inkling Lab',
    footerAbout: "Inkling Lab AB is Catherine Brockman's textile studio in Stockholm.",
    footerFind: 'Find me',
    skip: 'Skip to content',
    required: 'required',
    optional: 'optional',
    sending: 'Sending…',
    sendError:
      "The form couldn't be sent. Check your connection and try again, or email catherine@inkling.se.",
    status: { available: 'Available', reserved: 'Reserved', sold: 'Sold' },
    priceOnRequest: 'Price on request',
    currency: (n: number) => `${n.toLocaleString('sv-SE')}\u00a0SEK`,
    fallbackNotice: 'This post is only available in Swedish so far.',
    readMore: 'Read the post',
  },
} as const;

/** Keeps "7 000 kr" and "650 SEK" from breaking across lines. */
export const nbsp = (s: string) =>
  s.replace(/(\d) (\d{3})/g, '$1 $2').replace(/(\d) (kr|SEK|h)\b/g, '$1 $2');
