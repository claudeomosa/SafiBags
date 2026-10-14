// Pure (no fs) so the admin page can run it in the browser before saving, and CI can run it before deploying.
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)
const slug = (v) => String(v ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
const num = (v, label, max = 1e7) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${label} must be a number from 0 to ${max}`)
  return n
}

const NO_BIZ = { hero: { title: '', lead: '' }, sectors: [], products: [], printing: { on: false, text: '' } }

// Upgrades settings saved in an older format so nothing reading them has to care:
// per-bag price + orderStep -> one pack of orderStep bags; weight "100 g" -> gauge "100";
// no business section -> empty one. Already-current settings pass through unchanged.
export function migrate(c) {
  const step = Number(c?.orderStep) || 10
  const { orderStep, ...rest } = c || {}
  return {
    ...rest,
    products: (c?.products || []).map((p) => {
      if (Array.isArray(p.packs)) return p
      const { weight, price, ...q } = p
      return { ...q, gauge: q.gauge ?? String(weight ?? '').replace(/\s*g$/i, ''), packs: [{ bags: step, price: Number(price) * step }] }
    }),
    industries: c?.industries ?? structuredClone(NO_BIZ),
  }
}

// Trust boundary: admin input is coerced and checked here before it is written.
export function validate(c) {
  c = migrate(c)
  const digits = (v) => String(v ?? '').replace(/\D/g, '')
  const okPhone = (d) => d.length >= 10 && d.length <= 15
  const phone = digits(c?.business?.phone)
  if (!okPhone(phone)) throw new Error('Main WhatsApp number must be 10-15 digits with country code, e.g. 254768014285')
  const phone2 = digits(c?.business?.phone2)
  if (phone2 && !okPhone(phone2)) throw new Error('Secondary number must be 10-15 digits with country code, or left empty')

  const products = c?.products
  if (!Array.isArray(products) || !products.length || products.length > 20) throw new Error('Need 1-20 products')
  const seen = new Set()
  const cleanProducts = products.map((p, i) => {
    const name = str(p.name, 60)
    if (!name) throw new Error(`Product ${i + 1} needs a name, or remove it`)
    // ids are internal: keep the existing one, else derive from the name; never ask the admin
    let id = slug(p.id) || slug(name) || `product-${i + 1}`
    for (let n = 2; seen.has(id); n++) id = `${slug(p.id) || slug(name)}-${n}`
    seen.add(id)

    const packs = (Array.isArray(p.packs) ? p.packs : []).map((k) => {
      const bags = num(k.bags, `${name}: bags per pack`, 10000)
      if (!Number.isInteger(bags) || bags < 1) throw new Error(`${name}: bags per pack must be a whole number of at least 1`)
      const price = num(k.price, `${name}: price for a pack of ${bags}`, 1e6)
      if (price <= 0) throw new Error(`${name}: enter a price for the pack of ${bags}`)
      return { bags, price }
    }).sort((a, b) => a.bags - b.bags)
    if (!packs.length) throw new Error(`${name} needs at least one pack size`)
    if (new Set(packs.map((k) => k.bags)).size !== packs.length) throw new Error(`${name} has two packs with the same number of bags`)

    return { id, name, litres: num(p.litres, `${name} litres`, 1000), size: str(p.size, 30), gauge: str(p.gauge, 20), packs, active: !!p.active }
  })

  const repeats = (c.repeats || []).map((r) => str(r, 30)).filter(Boolean)
  if (!repeats.length) throw new Error('Need at least one repeat option')

  return {
    business: { phone, phone2, email: str(c.business.email, 100), location: str(c.business.location, 100), hours: str(c.business.hours, 100) },
    announcement: str(c.announcement, 160),
    hero: { line1: str(c.hero?.line1, 30), line2: str(c.hero?.line2, 30), lead: str(c.hero?.lead, 300) },
    products: cleanProducts,
    repeats,
    delivery: { areas: str(c.delivery?.areas, 300), minOrderKes: num(c.delivery?.minOrderKes, 'Minimum order', 1e7), note: str(c.delivery?.note, 300) },
    payment: str(c.payment, 200),
    industries: validateIndustries(c.industries),
  }
}

// Optional number: blank means "not set" (e.g. no price = price on quote)
const opt = (v, label, max) => (v === '' || v === null || v === undefined ? null : num(v, label, max))

function validateIndustries(b = {}) {
  const items = Array.isArray(b.products) ? b.products : []
  if (items.length > 60) throw new Error('Business range: at most 60 products')
  const seen = new Set()
  const products = items.map((p, i) => {
    const name = str(p.name, 80)
    if (!name) throw new Error(`Business product ${i + 1} needs a name, or remove it`)
    let id = slug(p.id) || slug(name) || `item-${i + 1}`
    for (let n = 2; seen.has(id); n++) id = `${slug(p.id) || slug(name)}-${n}`
    seen.add(id)
    const moq = opt(p.moq, `${name}: minimum order`, 100000)
    if (moq !== null && !Number.isInteger(moq)) throw new Error(`${name}: minimum order must be a whole number`)
    return {
      id, name,
      category: str(p.category, 40) || 'Other',
      size: str(p.size, 30), gauge: str(p.gauge, 20), colour: str(p.colour, 30),
      details: str(p.details, 160), // free text: material, features, uses
      unit: str(p.unit, 30), // blank = not shown (e.g. enquiry-only items)
      price: opt(p.price, `${name}: price`, 1e7) || null, // 0 or blank -> price on quote
      moq: moq || null,
      active: !!p.active,
    }
  })
  const sectors = (Array.isArray(b.sectors) ? b.sectors : [])
    .map((x) => ({ name: str(x.name, 40), text: str(x.text, 160) }))
    .filter((x) => x.name)
  return {
    hero: { title: str(b.hero?.title, 80), lead: str(b.hero?.lead, 300) },
    sectors,
    products,
    printing: { on: !!b.printing?.on, text: str(b.printing?.text, 300) },
  }
}
