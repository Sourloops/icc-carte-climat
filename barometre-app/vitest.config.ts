import { defineConfig } from 'vitest/config';

// Les tests portent sur le code partagé (contenu, tirage, calcul, logique des salles) : pas besoin de Cloudflare.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
