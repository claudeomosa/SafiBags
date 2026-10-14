import Site from './Site'
import raw from '../data/config.json'
import { validate } from '../lib/config'

// Same normalisation the admin and CI use: fills generated ids and defaults, fails the build on bad data
const config = validate(raw)

// Prices and settings are baked in at build time. Locally, admin edits to
// data/config.json hot-reload; on GitHub Pages, pushing the file triggers a rebuild.
export default function Page() {
  return <Site config={config} />
}
