export const waUrl = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

// "254768014285" -> "+254 768 014 285"
export const prettyPhone = (d) => `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`.trim()

export const mapsUrl = (lat, lng) => `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`

const kes = (n) => `KES ${n.toLocaleString('en-KE')}`

// "2026-10-10" -> "Sat, 10 Oct 2026". Built from parts so the day never shifts with the timezone.
export const prettyDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${dt.toLocaleDateString('en-GB', { weekday: 'short' })}, ${d} ${dt.toLocaleDateString('en-GB', { month: 'short' })} ${y}`
}

// A titled block, or nothing if every line in it is empty
const section = (title, lines) => {
  const body = lines.filter(Boolean)
  return body.length ? [title, ...body].join('\n') : null
}

// qty: { productId: bags }. Returns { text, total, bags, url } or null when nothing is ordered.
// Uses WhatsApp formatting: *bold*, _italic_; sections are separated by one blank line.
export function buildOrder({ products, phone, qty, name, area, location, mapLink, contactName, contactPhone, date, time, repeat, notes }) {
  const lines = products.filter((p) => qty[p.id] > 0).map((p) => ({ ...p, n: qty[p.id] }))
  if (!lines.length) return null
  const total = lines.reduce((s, l) => s + l.n * l.price, 0)
  const bags = lines.reduce((s, l) => s + l.n, 0)
  const repeating = repeat && repeat !== 'One-off'
  const contact = [contactName, contactPhone].filter(Boolean).join(' · ')

  const text = [
    `Hi Safi Bags 👋\nI'd like to place an order${name ? `. This is *${name}*` : ''}.`,

    section('🛍️ *ORDER*', [
      ...lines.map((l) => `• ${l.n} × ${l.name} _(${l.size})_ — ${kes(l.n * l.price)}`),
      `*Total: ${kes(total)}* · ${bags} bags`,
    ]),

    section('📍 *DELIVERY*', [
      area && `Area: ${area}`,
      location && `Location: ${location}`,
      mapLink && `Map: ${mapLink}`,
    ]),

    section('📅 *WHEN*', [
      date && `${prettyDate(date)}${time ? `, ${time.toLowerCase()}` : ''}`,
      !date && time && `Any day, ${time.toLowerCase()}`,
      repeating && `🔁 Repeat ${repeat.toLowerCase()}`,
    ]),

    section('👤 *RECEIVING CONTACT*', [contact]),

    section('📝 *NOTES*', [notes?.trim()]),

    '_Please confirm availability and delivery time. Thank you!_',
  ].filter(Boolean).join('\n\n')

  return { text, total, bags, url: waUrl(phone, text) }
}
