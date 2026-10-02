// The admin page lives at an unguessable URL from ADMIN_PATH. The real protection is the login + signed cookie.
export default {
  async rewrites() {
    return [{ source: `/${process.env.ADMIN_PATH || 'sb-console'}`, destination: '/admin-ui' }]
  },
}
