import Site from './Site'
import { readConfig } from '../lib/config'

export const dynamic = 'force-dynamic' // admin edits show up on the next request

export default function Page() {
  return <Site config={readConfig()} />
}
