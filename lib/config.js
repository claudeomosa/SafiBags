import fs from 'node:fs'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'config.json')

export const readConfig = () => JSON.parse(fs.readFileSync(FILE, 'utf8'))

// write-then-rename so a crash never leaves a half-written file
export function writeConfig(cfg) {
  const tmp = FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2))
  fs.renameSync(tmp, FILE)
}

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)
const num = (v, label, max = 1e7) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${label} must be a number from 0 to ${max}`)
  return n
}

// Trust boundary: admin input is coerced and checked here before it is written.
export function validate(c) {
  const digits = (v) => String(v ?? '').replace(/\D/g, '')
  const okPhone = (d) => d.length >= 10 && d.length <= 15
  const phone = digits(c?.business?.phone)
  if (!okPhone(phone)) throw new Error('Main WhatsApp number must be 10-15 digits with country code, e.g. 254768014285')
  const phone2 = digits(c?.business?.phone2)
  if (phone2 && !okPhone(phone2)) throw new Error('Secondary number must be 10-15 digits with country code, or left empty')

  const products = c?.products
  if (!Array.isArray(products) || !products.length || products.length > 20) throw new Error('Need 1-20 products')
  const seen = new Set()
  const cleanProducts = products.map((p) => {
    const id = str(p.id, 30).toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (!id || seen.has(id)) throw new Error(`Duplicate or empty product id: "${id}"`)
    seen.add(id)
    const name = str(p.name, 60)
    if (!name) throw new Error('Every product needs a name')
    return { id, name, litres: num(p.litres, `${name} litres`, 1000), size: str(p.size, 30), weight: str(p.weight, 20), price: num(p.price, `${name} price`, 100000), active: !!p.active }
  })

  const repeats = (c.repeats || []).map((r) => str(r, 30)).filter(Boolean)
  if (!repeats.length) throw new Error('Need at least one repeat option')
  const orderStep = num(c.orderStep, 'Order step', 1000)
  if (orderStep < 1) throw new Error('Order step must be at least 1')

  return {
    business: { phone, phone2, email: str(c.business.email, 100), location: str(c.business.location, 100) },
    announcement: str(c.announcement, 160),
    hero: { line1: str(c.hero?.line1, 30), line2: str(c.hero?.line2, 30), lead: str(c.hero?.lead, 300) },
    products: cleanProducts,
    repeats,
    delivery: { areas: str(c.delivery?.areas, 300), minOrderKes: num(c.delivery?.minOrderKes, 'Minimum order', 1e7), note: str(c.delivery?.note, 300) },
    payment: str(c.payment, 200),
    orderStep,
  }
}
