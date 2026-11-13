/** @type {import('tailwindcss').Config} */

// Typography tokens live in globals.css as CSS variables so the same scale is
// shared by Tailwind utilities, plain CSS and both interface languages.
const type = (size, leading) => [`var(--type-${size})`, { lineHeight: `var(--leading-${leading})` }];

module.exports = {
  darkMode: 'class',
  content: [
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#060d1d',
          850: '#0a1528',
          800: '#0e1e38',
          700: '#162b4f',
          600: '#1f3b6a',
        },
        neon: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-cairo)', 'system-ui', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },
      fontSize: {
        // Compact metadata floor (12px). Nothing in the interface is smaller.
        '2xs': type('micro', 'body'),
        xs: type('meta', 'body'),
        sm: type('support', 'body'),
        base: type('body', 'body'),
        lg: type('lead', 'snug'),
        'card-title': type('card-title', 'snug'),
        'section-title': type('section-title', 'tight'),
        'page-title': type('page-title', 'tight'),
      },
    },
  },
  plugins: [],
};
