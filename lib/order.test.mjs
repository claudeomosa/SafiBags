import assert from 'node:assert/strict'
import { buildOrder, buildQuote, enquiryText, sizeCm, micron, mapsUrl, perBag, prettyPhone, prettyDate } from './order.js'
import fs from 'node:fs'
import { migrate, validate } from './config.js'
import { toB64, fromB64, loadConfig, saveConfig } from './github.js'

const readConfig = () => JSON.parse(fs.readFileSync(new URL('../data/config.json', import.meta.url), 'utf8'))

// Fixed sample products: the real data/config.json can change prices freely without breaking these
const products = [
  { id: 'kitchen', name: 'Kitchen bin', litres: 40, size: '20 × 30 in', gauge: '100', packs: [{ bags: 10, price: 40 }, { bags: 50, price: 180 }], active: true },
  { id: 'big', name: 'Big bin', litres: 100, size: '30 × 36 in', gauge: '100', packs: [{ bags: 10, price: 80 }], active: true },
]
const phone = '254768014285'
assert.equal(buildOrder({ products, phone, qty: { kitchen: 0 } }), null)

// qty counts packs; pack picks the pack size (default: smallest)
const o = buildOrder({ products, phone, qty: { kitchen: 2, big: 1 }, pack: { kitchen: 50 }, name: 'Wanjiru', area: '', date: '2026-10-10', time: 'Morning', repeat: 'Every week', notes: '' })
assert.equal(o.total, 2 * 180 + 80)
assert.equal(o.bags, 2 * 50 + 10)
assert.match(o.text, /^Hi Safi Bags 👋\nI'd like to place an order\. This is \*Wanjiru\*\./)
assert.match(o.text, /• 2 × Kitchen bin, pack of 50 _\(20 × 30 in\)_ — KES 360/)
assert.match(o.text, /• 1 × Big bin, pack of 10 _\(30 × 36 in\)_ — KES 80/)
assert.match(o.text, /\*Total: KES 440\* · 110 bags/)
assert.equal(buildOrder({ products, phone, qty: { kitchen: 1 }, pack: { kitchen: 999 } }).total, 40, 'unknown pack falls back to smallest')
assert.equal(perBag({ bags: 50, price: 180 }), 3.6)
assert.match(o.text, /📅 \*WHEN\*\nSat, 10 Oct 2026, morning\n🔁 Repeat every week/)
assert.ok(!o.text.includes('DELIVERY') && !o.text.includes('NOTES') && !o.text.includes('RECEIVING'), 'empty sections are skipped')
assert.ok(!/\n{3,}/.test(o.text), 'never more than one blank line')
assert.ok(o.text.endsWith('_Please confirm availability and delivery time. Thank you!_'))
assert.ok(o.url.startsWith(`https://wa.me/${phone}?text=`))
assert.ok(!buildOrder({ products, phone, qty: { big: 1 }, repeat: 'One-off' }).text.includes('Repeat'))
assert.ok(!buildOrder({ products, phone, qty: { big: 1 } }).text.includes('This is'), 'no name, no greeting name')

// delivery details: location, map link and a different receiving contact
const d = buildOrder({ products, phone, qty: { big: 10 }, area: 'Kilimani', location: 'Gate B, 3rd floor', mapLink: mapsUrl(-1.2921, 36.8219), contactName: 'Otieno', contactPhone: '0722000000', notes: '  Call on arrival ' })
assert.match(d.text, /📍 \*DELIVERY\*\nArea: Kilimani\nLocation: Gate B, 3rd floor\nMap: https:\/\/maps\.google\.com\/\?q=-1\.292100,36\.821900/)
assert.match(d.text, /👤 \*RECEIVING CONTACT\*\nOtieno · 0722000000/)
assert.match(d.text, /📝 \*NOTES\*\nCall on arrival\n/)
assert.match(buildOrder({ products, phone, qty: { big: 10 }, contactPhone: '0722' }).text, /RECEIVING CONTACT\*\n0722$/m)
assert.equal(prettyPhone('254768014285'), '+254 768 014 285')
assert.equal(prettyDate('2026-01-01'), 'Thu, 1 Jan 2026')
assert.match(buildOrder({ products, phone, qty: { kitchen: 40 } }).text, /KES 1,600/)

// admin validation: the committed config must be valid (CI runs this before every deploy)
validate(readConfig()) // the ONLY check on the real settings: they must be valid

// Everything below uses this fixed sample, so admin edits to the real settings can never fail a deploy
const good = {
  business: { phone: '254768014285', phone2: '254719399123', email: '', location: 'Nairobi, Kenya', hours: '' },
  announcement: '',
  hero: { line1: 'Clean', line2: 'starts here.', lead: 'Lead' },
  products: [
    { id: 'kitchen', name: 'Kitchen bin', litres: 40, size: '20 × 30 in', gauge: '100', packs: [{ bags: 50, price: 700 }], active: true },
    { id: 'big', name: 'Big bin', litres: 100, size: '30 × 36 in', gauge: '100', packs: [{ bags: 50, price: 850 }], active: true },
  ],
  repeats: ['One-off', 'Every week'],
  delivery: { areas: '', minOrderKes: 0, note: '' },
  payment: '',
  industries: {
    hero: { title: 'For business', lead: 'Lead' },
    sectors: [{ name: 'Hospitals & clinics', text: 'Ward bins' }],
    products: [{ id: 'bin-liner-20-30-in', name: 'Bin liner 20 × 30 in', category: 'Bin liners', size: '20 × 30 in', gauge: '100', colour: '', details: '', unit: 'Pack of 50', price: 700, moq: null, active: true }],
    printing: { on: false, text: '' },
  },
}
assert.deepEqual(validate(good), good, 'sample is already in saved form')
const bad = (f, msg) => assert.throws(() => { const c = structuredClone(good); f(c); validate(c) }, msg)
bad((c) => (c.products[0].packs[0].price = -1))
bad((c) => (c.products[0].packs[0].price = ''), /enter a price/)
bad((c) => (c.products[0].packs[0].bags = 2.5), /whole number/)
bad((c) => (c.products[0].packs = []), /at least one pack/)
bad((c) => c.products[0].packs.push({ ...c.products[0].packs[0] }), /same number of bags/)
bad((c) => (c.business.phone = '123'))
bad((c) => (c.products = []))
bad((c) => (c.business.phone2 = '12'))

// "Add product" as the admin does it: an unnamed row says so clearly, a named one saves
const add = (p) => { const c = structuredClone(good); c.products.push(p); return c }
const fresh = { name: '', litres: 60, size: '', gauge: '', packs: [{ bags: 10, price: '' }], active: true }
assert.throws(() => validate(add(fresh)), new RegExp(`Product ${good.products.length + 1} needs a name`))
const added = validate(add({ ...fresh, name: 'Jumbo bin', litres: '120', packs: [{ bags: '20', price: '300' }] })).products.at(-1)
assert.deepEqual(added, { id: 'jumbo-bin', name: 'Jumbo bin', litres: 120, size: '', gauge: '', packs: [{ bags: 20, price: 300 }], active: true })
// ids are generated, never clash, and existing ones are kept
const twice = validate(add({ ...fresh, name: good.products[0].name, packs: [{ bags: 5, price: 20 }] }))
assert.equal(new Set(twice.products.map((p) => p.id)).size, twice.products.length)
assert.equal(twice.products[0].id, good.products[0].id)
assert.deepEqual(validate(add({ ...fresh, name: 'X', packs: [{ bags: 50, price: 1 }, { bags: 10, price: 1 }] })).products.at(-1).packs.map((k) => k.bags), [10, 50], 'packs sorted smallest first')
assert.equal(validate({ ...good, business: { ...good.business, phone2: '' } }).business.phone2, '')
assert.equal(validate({ ...good, business: { ...good.business, phone: '+254 768 014 285' } }).business.phone, '254768014285')

// business quote: priced items total up, unpriced ones are "price on quote"
const biz = [
  { id: 'a', name: 'Bin liner 20 × 30 in', size: '20 × 30 in', gauge: '100', colour: '', unit: 'Pack of 50', price: 700 },
  { id: 'b', name: 'Clinical liner', size: '40 × 50 in', gauge: '', colour: 'Yellow', unit: 'Carton', price: null },
]
assert.equal(buildQuote({ products: biz, phone, qty: {} }), null)
const q = buildQuote({ products: biz, phone, qty: { a: 20, b: 2 }, company: 'Acme Clinic', sector: 'Hospitals & clinics', frequency: 'Every month', invoice: true, kraPin: 'P051234567X', printing: true, printDetails: 'Logo' })
assert.equal(q.total, 14000)
assert.equal(q.quoted, true)
assert.equal(q.units, 22)
assert.match(q.text, /quote\* for \*Acme Clinic\* \(Hospitals & clinics\)/)
assert.match(q.text, /• 20 × Pack of 50 — Bin liner 20 × 30 in _\(100 gauge\)_ — KES 14,000/, 'size not repeated when in the name')
assert.match(q.text, /• 2 × Carton — Clinical liner _\(40 × 50 in, Yellow\)_ — price on quote/)
assert.match(q.text, /\*Estimated: KES 14,000\* \+ quoted items/)
assert.match(q.text, /Custom printing: Logo\nInvoice needed · KRA PIN P051234567X/)
assert.ok(!/\n{3,}/.test(q.text))
assert.ok(!buildQuote({ products: biz, phone, qty: { b: 1 } }).text.includes('Estimated'), 'no estimate when nothing is priced')
// enquiry-only products (no unit, no price) and the one-tap enquiry text
const enq = { id: 'z', name: 'Ziplock bags', category: 'Ziplock & self-seal bags', size: '', gauge: '', colour: '', unit: '', price: null }
assert.match(buildQuote({ products: [enq], phone, qty: { z: 3 } }).text, /• 3 × Ziplock bags — price on quote/)
assert.equal(enquiryText(enq), "Hi Safi Bags 👋\nI'm interested in *Ziplock bags* (Ziplock & self-seal bags).\nPlease share sizes, prices and minimum order. Thank you!")
assert.equal(sizeCm('20 × 30 in'), '50.8 × 76.2 cm')
assert.equal(sizeCm('A4'), null)
assert.equal(micron('100'), 25)

// business range validation
const withBiz = (f) => { const c = structuredClone(good); f(c.industries); return validate(c).industries }
assert.deepEqual(validate({ ...good, industries: undefined }).industries.products, [], 'older settings without a business section still load')
assert.throws(() => withBiz((b) => b.products.push({ name: '' })), /Business product \d+ needs a name/)
const one = withBiz((b) => b.products.push({ name: 'Clinical liner', price: '', moq: '10', active: true })).products.at(-1)
assert.equal(one.price, null)
assert.equal(one.moq, 10)
assert.equal(one.category, 'Other')
assert.throws(() => withBiz((b) => b.products.push({ name: 'X', moq: '2.5' })), /whole number/)
assert.deepEqual(withBiz((b) => b.sectors.push({ name: '', text: 'ignored' })).sectors.length, good.industries.sectors.length, 'blank sectors dropped')

// settings still in the old format (what GitHub has before this version is deployed) load and validate
const old = { business: { phone: '254768014285', phone2: '', email: '', location: 'Nairobi' }, announcement: '', hero: { line1: 'a', line2: 'b', lead: 'c' },
  products: [{ id: 'kitchen', name: 'Kitchen bin', litres: 40, size: '20 × 30 in', weight: '100 g', price: 4, active: true }],
  repeats: ['One-off'], delivery: { areas: '', minOrderKes: 0, note: '' }, payment: '', orderStep: 10 }
const upd = migrate(old)
assert.deepEqual(upd.products[0], { id: 'kitchen', name: 'Kitchen bin', litres: 40, size: '20 × 30 in', gauge: '100', packs: [{ bags: 10, price: 40 }], active: true })
assert.ok(!('orderStep' in upd) && Array.isArray(upd.industries.products))
assert.deepEqual(validate(old).products[0].packs, [{ bags: 10, price: 40 }])
assert.deepEqual(migrate(good), good, 'current settings pass through unchanged')

// GitHub save path, against a fake fetch
const text = JSON.stringify(good)
assert.equal(fromB64(toB64(text)), text) // survives "×" and other non-ASCII
assert.equal(fromB64(toB64('20 × 30 in').replace(/(.{4})/g, '$1\n')), '20 × 30 in') // GitHub wraps base64 in newlines
const calls = []
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, ...init })
  if (init.method === 'PUT') {
    const body = JSON.parse(init.body)
    if (body.sha !== 'v1') return { ok: false, status: 409, json: async () => ({}) }
    return { ok: true, json: async () => ({ content: { sha: 'v2' }, commit: { html_url: 'https://github.com/x/commit/1' } }) }
  }
  return { ok: true, json: async () => ({ content: toB64(text), sha: 'v1' }) }
}
const loaded = await loadConfig('tok')
assert.deepEqual(loaded, { cfg: good, sha: 'v1' })
assert.match(calls[0].url, /\/contents\/data\/config\.json\?ref=main$/)
assert.equal(calls[0].headers.Authorization, 'Bearer tok')
const saved = await saveConfig('tok', good, 'v1')
assert.deepEqual(saved, { sha: 'v2', commitUrl: 'https://github.com/x/commit/1' })
const put = JSON.parse(calls[1].body)
assert.equal(put.branch, 'main')
assert.deepEqual(JSON.parse(fromB64(put.content)), good)
await assert.rejects(saveConfig('tok', good, 'stale'), /changed somewhere else/)

console.log('order + config + github ok')
