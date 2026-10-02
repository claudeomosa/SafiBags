// Fully static site. PAGES=true (set in the deploy workflow) serves it from /SafiBags on GitHub Pages.
// trailingSlash makes /admin/ a folder with index.html, which GitHub Pages serves directly.
export default {
  output: 'export',
  trailingSlash: true,
  ...(process.env.PAGES === 'true' && { basePath: '/SafiBags' }),
}
