import localFont from 'next/font/local';

// Self-hosted variable fonts (SIL Open Font License). One file per script
// replaces the fifteen static weights previously requested from Google Fonts.
// Latin text always renders in Inter and Arabic text in Cairo, in both
// interface languages, so mixed-language content stays visually consistent.
export const inter = localFont({
  src: './inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const cairo = localFont({
  src: './cairo-arabic-wght-normal.woff2',
  weight: '200 1000',
  style: 'normal',
  display: 'swap',
  variable: '--font-cairo',
  // Only fetched when Arabic glyphs are actually rendered.
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'unicode-range', value: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC' },
  ],
});
