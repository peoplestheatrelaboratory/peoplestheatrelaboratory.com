// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://peoplestheatrelaboratory.com',
  trailingSlash: 'ignore',
  build: {
    // /about -> /about/index.html, so URLs stay clean without a server
    format: 'directory',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
