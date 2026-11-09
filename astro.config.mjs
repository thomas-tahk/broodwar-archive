import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://thomas-tahk.github.io',
  // Branch previews build under /broodwar-archive/<branch>/ (see pages.yml).
  base: process.env.SITE_BASE ?? '/broodwar-archive/',
  output: 'static',
  trailingSlash: 'always',
});
