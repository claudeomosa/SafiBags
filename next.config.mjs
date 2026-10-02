// PAGES=true builds the static public site for GitHub Pages (served from /SafiBags).
// Otherwise this is the local dev server, where the admin lives at ADMIN_PATH
// (protected by the login + signed cookie, not by the URL).
const pages = process.env.PAGES === 'true'

export default pages
  ? { output: 'export', basePath: '/SafiBags' }
  : {
      async rewrites() {
        return [{ source: `/${process.env.ADMIN_PATH || 'sb-console'}`, destination: '/admin-ui' }]
      },
    }
