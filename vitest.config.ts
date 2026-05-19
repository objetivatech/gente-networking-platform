/**
 * Vitest config — testes unitários para regras críticas (permissões, hooks).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
});
