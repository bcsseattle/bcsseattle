const { fontFamily } = require('tailwindcss/defaultTheme');

const hsl = (name) => `hsl(var(--${name}))`;
const tone = (name) => ({ bg: hsl(`${name}-bg`), border: hsl(`${name}-border`), text: hsl(`${name}-text`) });

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Art Gallery tokens; values live in styles/main.css.
      colors: {
        border: {
          DEFAULT: hsl('border'),
          strong: hsl('border-strong'),
        },
        input: hsl('input'),
        ring: hsl('ring'),
        background: hsl('background'),
        foreground: hsl('foreground'),
        mat: hsl('mat'),
        primary: {
          DEFAULT: hsl('primary'),
          foreground: hsl('primary-foreground'),
        },
        secondary: {
          DEFAULT: hsl('secondary'),
          foreground: hsl('secondary-foreground'),
        },
        destructive: {
          DEFAULT: hsl('destructive'),
          foreground: hsl('destructive-foreground'),
        },
        muted: {
          DEFAULT: hsl('muted'),
          foreground: hsl('muted-foreground'),
        },
        accent: {
          DEFAULT: hsl('accent'),
          foreground: hsl('accent-foreground'),
          100: hsl('accent-100'),
          200: hsl('accent-200'),
        },
        popover: {
          DEFAULT: hsl('popover'),
          foreground: hsl('popover-foreground'),
        },
        card: {
          DEFAULT: hsl('card'),
          foreground: hsl('card-foreground'),
        },
        badge: {
          green: tone('badge-green'),
          orange: tone('badge-orange'),
          blue: tone('badge-blue'),
          purple: tone('badge-purple'),
          red: tone('badge-red'),
          neutral: tone('badge-neutral'),
        },
        'money-negative': tone('money-negative'),
        paper: {
          DEFAULT: hsl('paper'),
          ink: hsl('paper-ink'),
          muted: hsl('paper-muted'),
          rule: hsl('paper-rule'),
        },
      },
      fontFamily: {
        // Inter and Source Serif 4, loaded with next/font in app/layout.tsx.
        sans: ['var(--font-sans)', ...fontFamily.sans],
        serif: ['var(--font-serif)', ...fontFamily.serif],
      },
      // Art Gallery text styles (Figma Type 18:490): [size, { lineHeight, fontWeight, letterSpacing }].
      fontSize: {
        hero: ['3.5rem', { lineHeight: '3.875rem', fontWeight: '400', letterSpacing: '-0.01em' }], // proposed Display/Hero, serif 56/62
        'doc-title': ['1.75rem', { lineHeight: '2rem', fontWeight: '400' }], // Document/Title, serif 28/32
        'doc-lead': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '400' }], // Document/Artwork Title Roman, serif 18/24
        display: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600', letterSpacing: '-0.01em' }], // Title/Display 30/36
        screen: ['1.375rem', { lineHeight: '1.75rem', fontWeight: '600' }], // Title/Screen 22/28
        panel: ['1.25rem', { lineHeight: '1.625rem', fontWeight: '500' }], // Title/Panel 20/26
        figure: ['1.25rem', { lineHeight: '1.5rem', fontWeight: '500' }], // Figure/Price 20/24
        section: ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600' }], // Title/Section 17/24
        item: ['0.9375rem', { lineHeight: '1.25rem', fontWeight: '600' }], // Title/Item 15/20
        body: ['0.875rem', { lineHeight: '1.25rem' }], // Body/* 14/20
        table: ['0.8125rem', { lineHeight: '1.125rem' }], // Table/* 13/18
        caption: ['0.75rem', { lineHeight: '1rem' }], // Caption/* 12/16
        micro: ['0.6875rem', { lineHeight: '0.875rem' }], // Micro/* 11/14
        overline: ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '600', letterSpacing: '0.06em' }], // Label/Overline 11/14, uppercase
      },
      spacing: {
        13: '3.25rem', // row and topbar height (52px)
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)", // 12
        lg: "var(--radius)", // 8
        md: "calc(var(--radius) - 2px)", // 6
        sm: "calc(var(--radius) - 4px)", // 4
      },
      boxShadow: {
        sm: '0 0 2px #08131E0A, 0 2px 8px #08131E05', // Shadow/Card SM
        md: '0 1px 4px #08131E0D, 0 10px 22px #08131E1A', // Shadow/Card LG
        lg: '0 1px 4px #08131E0D, 0 10px 22px #08131E1A', // Shadow/Card LG
        panel: '-8px 0 24px -12px #08131E26', // Shadow/Panel
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
