import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/feuerwehr-lernbar/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  json: {
    stringify: true,
  },
});
