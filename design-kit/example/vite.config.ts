import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        laboratory: fileURLToPath(new URL('./index.html', import.meta.url)),
        integration: fileURLToPath(new URL('./integration.html', import.meta.url)),
      },
    },
  },
});
