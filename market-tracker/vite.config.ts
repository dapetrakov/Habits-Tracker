import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { marketData } from './vite-plugin-market-data';

// `npm run dev:sample` (mode "sample") shows clearly-fake demo data instead of the real files.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    marketData({ dir: mode === 'sample' ? 'samples/updates' : 'data/updates', sample: mode === 'sample' }),
  ],
}));
