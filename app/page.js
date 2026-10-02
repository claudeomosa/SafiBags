import Site from './Site'
import config from '../data/config.json'

// Prices and settings are baked in at build time. Locally, admin edits to
// data/config.json hot-reload; on GitHub Pages, pushing the file triggers a rebuild.
export default function Page() {
  return <Site config={config} />
}
