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

// The pack a product is sold in: the one picked (by bag count), else its smallest
export const packFor = (p, bags) => p.packs.find((k) => k.bags === bags) || p.packs[0]

export const perBag = (k) => Math.round((k.price / k.bags) * 100) / 100

// qty: { productId: number of packs }, pack: { productId: bags per pack chosen }.
export const orderLines = (products, qty, pack = {}) =>
  products.filter((p) => qty[p.id] > 0).map((p) => {
    const k = packFor(p, pack[p.id])
    return { ...p, pack: k, n: qty[p.id], bags: qty[p.id] * k.bags, cost: qty[p.id] * k.price }
  })

// Returns { text, total, bags, url } or null when nothing is ordered.
// Uses WhatsApp formatting: *bold*, _italic_; sections are separated by one blank line.
export function buildOrder({ products, phone, qty, pack, name, area, location, mapLink, contactName, contactPhone, date, time, repeat, notes }) {
  const lines = orderLines(products, qty, pack)
  if (!lines.length) return null
  const total = lines.reduce((s, l) => s + l.cost, 0)
  const bags = lines.reduce((s, l) => s + l.bags, 0)
  const repeating = repeat && repeat !== 'One-off'
  const contact = [contactName, contactPhone].filter(Boolean).join(' · ')

  const text = [
    `Hi Safi Bags 👋\nI'd like to place an order${name ? `. This is *${name}*` : ''}.`,

    section('🛍️ *ORDER*', [
      ...lines.map((l) => `• ${l.n} × ${l.name}, pack of ${l.pack.bags} _(${l.size})_ — ${kes(l.cost)}`),
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

// "20 × 30 in" -> "50.8 × 76.2 cm" (null if the size isn't in inches)
export const sizeCm = (size) => {
  const n = String(size).match(/^\s*([\d.]+)\s*[×x]\s*([\d.]+)\s*in\s*$/i)
  return n ? `${(n[1] * 2.54).toFixed(1)} × ${(n[2] * 2.54).toFixed(1)} cm` : null
}

// Gauge to micron: 100 gauge = 25 micron
export const micron = (gauge) => (Number(gauge) > 0 ? Number(gauge) / 4 : null)

// Business quote request. qty: { productId: units }. Items without a price are "price on quote".
// Returns { text, total, units, quoted, url } or null when nothing is selected.
export function buildQuote({ products, phone, qty, company, contact, sector, area, location, mapLink, frequency, date, printing, printDetails, invoice, kraPin, notes }) {
  const lines = products.filter((p) => qty[p.id] > 0).map((p) => ({ ...p, n: qty[p.id], cost: p.price ? qty[p.id] * p.price : null }))
  if (!lines.length) return null
  const total = lines.reduce((s, l) => s + (l.cost || 0), 0)
  const quoted = lines.some((l) => l.cost === null)
  const units = lines.reduce((s, l) => s + l.n, 0)
  const spec = (l) => [!l.name.includes(l.size) && l.size, l.gauge && `${l.gauge} gauge`, l.colour].filter(Boolean).join(', ')

  const text = [
    `Hi Safi Bags 👋\nWe'd like a *quote*${company ? ` for *${company}*` : ''}${sector ? ` (${sector})` : ''}.`,

    section('📦 *ITEMS*', [
      ...lines.map((l) => `• ${l.n} × ${l.unit ? `${l.unit} — ${l.name}` : l.name}${spec(l) ? ` _(${spec(l)})_` : ''} — ${l.cost === null ? 'price on quote' : kes(l.cost)}`),
      total > 0 && `*Estimated: ${kes(total)}*${quoted ? ' + quoted items' : ''}`,
    ]),

    section('📍 *DELIVERY*', [
      area && `Area: ${area}`,
      location && `Location: ${location}`,
      mapLink && `Map: ${mapLink}`,
      frequency && frequency !== 'One-off' && `🔁 ${frequency}`,
      date && `First delivery: ${prettyDate(date)}`,
    ]),

    section('🧾 *REQUIREMENTS*', [
      printing && `Custom printing${printDetails ? `: ${printDetails}` : ''}`,
      invoice && `Invoice needed${kraPin ? ` · KRA PIN ${kraPin}` : ''}`,
    ]),

    section('👤 *CONTACT*', [contact]),

    section('📝 *NOTES*', [notes?.trim()]),

    '_Please send prices and delivery timelines. Thank you!_',
  ].filter(Boolean).join('\n\n')

  return { text, total, units, quoted, url: waUrl(phone, text) }
}

// One-tap WhatsApp enquiry for a single business product
export const enquiryText = (p) =>
  `Hi Safi Bags 👋\nI'm interested in *${p.name}*${p.category ? ` (${p.category})` : ''}.\nPlease share sizes, prices and minimum order. Thank you!`
