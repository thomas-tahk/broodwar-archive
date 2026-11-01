import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://thomas-tahk.github.io',
  base: '/broodwar-archive/',
  output: 'static',
  trailingSlash: 'always',
});
