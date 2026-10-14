import Industries from '../Industries'
import raw from '../../data/config.json'
import { validate } from '../../lib/config'

// Same normalisation the admin and CI use: fills generated ids and defaults, fails the build on bad data
const config = validate(raw)

export const metadata = {
  title: 'Safi Bags for Business | Bulk bin liners in Kenya',
  description: 'Bulk bin liners for hospitals, hotels, offices, shops and sites. Request a quote on WhatsApp.',
}

export default function Page() {
  return <Industries config={config} />
}
