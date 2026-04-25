import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project sites at https://<user>.github.io/<repo>/
// the base path must match the repo name. Set BASE at build time.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: { port: 5173 },
});
