import assert from 'node:assert/strict'
import { buildOrder, mapsUrl, prettyPhone, prettyDate } from './order.js'
import fs from 'node:fs'
import { validate } from './config.js'
import { toB64, fromB64, loadConfig, saveConfig } from './github.js'

const readConfig = () => JSON.parse(fs.readFileSync(new URL('../data/config.json', import.meta.url), 'utf8'))

const products = readConfig().products
const phone = readConfig().business.phone
assert.equal(phone, '254768014285') // main number receives orders
assert.equal(buildOrder({ products, phone, qty: { kitchen: 0 } }), null)

const o = buildOrder({ products, phone, qty: { kitchen: 50, big: 10 }, name: 'Wanjiru', area: '', date: '2026-10-10', time: 'Morning', repeat: 'Every week', notes: '' })
assert.equal(o.total, 50 * 4 + 10 * 8)
assert.equal(o.bags, 60)
assert.match(o.text, /^Hi Safi Bags 👋\nI'd like to place an order\. This is \*Wanjiru\*\./)
assert.match(o.text, /• 50 × Kitchen bin _\(20 × 30 in\)_ — KES 200/)
assert.match(o.text, /\*Total: KES 280\* · 60 bags/)
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
assert.match(buildOrder({ products, phone, qty: { kitchen: 400 } }).text, /KES 1,600/)

// admin validation: the committed config must be valid (CI runs this before every deploy)
const good = readConfig()
validate(good)
const bad = (f) => assert.throws(() => { const c = structuredClone(good); f(c); validate(c) })
bad((c) => (c.products[0].price = -1))
bad((c) => (c.products[1].id = c.products[0].id))
bad((c) => (c.business.phone = '123'))
bad((c) => (c.products = []))
bad((c) => (c.orderStep = 0))
bad((c) => (c.business.phone2 = '12'))
assert.equal(validate({ ...good, business: { ...good.business, phone2: '' } }).business.phone2, '')
assert.equal(validate({ ...good, business: { ...good.business, phone: '+254 768 014 285' } }).business.phone, '254768014285')

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
