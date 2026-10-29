import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

/**
 * Deux façons de construire :
 *  - `npm run dev` / `npm run deploy:api` : site + serveur des parties ensemble (Cloudflare), à la racine.
 *  - `npm run build:site` (mode « pages ») : site seul, servi par GitHub Pages sous france4degres.fr/barometre/.
 *    Il est écrit dans ../barometre, que l'on commite avec le reste du dépôt.
 */
export default defineConfig(({ mode }) => {
  const pages = mode === 'pages';
  return {
    base: pages ? '/barometre/' : '/',
    plugins: pages ? [] : [cloudflare()],
    server: { host: true },
    build: pages ? { outDir: '../barometre', emptyOutDir: true } : {},
  };
});
