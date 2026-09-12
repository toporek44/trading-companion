// Local-dev-only Vite config. This is NOT part of the production build —
// Vercel deploys index.html / styles.css / js/*.js / api/*.js unchanged,
// with no build step. Vite here just gives a nicer local dev server
// (fast reload, native ES modules) than `python3 -m http.server`.
//
// Vite's dev server has no concept of Vercel serverless functions, so
// same-origin calls this app makes to /api/scanner-gainers and
// /api/scanner-news would 404 under plain `vite`/`npm run dev`. The proxy
// below forwards any /api/* request to a `vercel dev` instance running on
// port 3000, so those calls work when both are running together. See
// CLAUDE.md / README.md for the two supported local dev modes.
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
