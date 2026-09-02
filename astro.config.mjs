// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

const google = fontProviders.google();

// https://astro.build/config
export default defineConfig({
  site: 'https://peoplestheatrelaboratory.com',
  trailingSlash: 'always',
  build: {
    // /about -> /about/index.html, so URLs stay clean without a server
    format: 'directory',
    // the whole site's CSS is a few kB; inlining it costs less than the two
    // render-blocking round trips it replaces
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  /* The five voices, self-hosted. Fetched at build time and served from our own
     origin: a stylesheet on fonts.googleapis.com blocked the first render for
     ~1.2s, and the couplet that opens the site is the LCP element. */
  fonts: [
    {
      provider: google,
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      weights: [400],
      styles: ['normal', 'italic'],
      // the soft-serif cut the design calls for
      variationSettings: "'SOFT' 50",
      fallbacks: ['Iowan Old Style', 'Georgia', 'serif'],
    },
    {
      provider: google,
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: [300, 400],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: google,
      name: 'Tiro Devanagari Hindi',
      cssVariable: '--font-tiro',
      weights: [400],
      styles: ['normal'],
      subsets: ['devanagari', 'latin'],
      fallbacks: ['Noto Serif Devanagari', 'Georgia', 'serif'],
    },
    {
      provider: google,
      name: 'Courier Prime',
      cssVariable: '--font-courier-prime',
      weights: [400],
      styles: ['normal'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    {
      provider: google,
      name: 'Kalam',
      cssVariable: '--font-kalam',
      weights: [300, 400],
      styles: ['normal'],
      fallbacks: ['Bradley Hand', 'cursive'],
    },
  ],
});
