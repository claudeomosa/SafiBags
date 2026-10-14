'use client'
import { useEffect, useMemo, useState } from 'react'
import { buildOrder, orderLines, packFor, perBag, waUrl, prettyDate, mapsUrl } from '../lib/order'
import Link from 'next/link'
import Mark3D from './Mark3D'
import { Mark, WaIcon, PinIcon, waFormat, Header, Footer } from './shared'

const GEO_MSG = {
  ok: 'Pin added from your current location.',
  denied: 'Location permission was blocked. Paste a maps link instead.',
  fail: 'Could not get your location. Paste a maps link instead.',
  none: 'Your browser cannot share location. Paste a maps link instead.',
}

// Pack size chips on a product card; hidden when there's only one pack
const PackPicker = ({ p, value, onPick }) =>
  p.packs.length > 1 && (
    <div className="packs" role="group" aria-label={`${p.name} pack size`}>
      {p.packs.map((k) => (
        <button key={k.bags} type="button" className={k.bags === value ? 'on' : ''} aria-pressed={k.bags === value} onClick={() => onPick(k.bags)}>
          {k.bags} bags
        </button>
      ))}
    </div>
  )

// Bag illustration whose height grows with bin litres, so sizes compare at a glance
const BagArt = ({ litres, max }) => {
  const h = 46 + (litres / max) * 54
  return (
    <svg viewBox="0 0 120 120" className="bagart" aria-hidden="true">
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="currentColor" opacity=".12" />
      <g transform={`translate(60 110) scale(${h / 100}) translate(-60 -100)`}>
        <path fill="currentColor" d="M28 36c0-5 3-7 8-7h48c5 0 8 2 8 7l6 54c1 8-4 10-10 10H32c-6 0-11-2-10-10Z" />
        <path fill="currentColor" d="M60 29c-8-17-26-19-24-8 1 8 14 9 24 8Zm0 0c8-17 26-19 24-8-1 8-14 9-24 8Z" />
        <path fill="#B4E12B" d="M60 45c1.5 8 4.5 11 14 13-9.5 2-12.5 5-14 13-1.5-8-4.5-11-14-13 9.5-2 12.5-5 14-13Z" />
      </g>
    </svg>
  )
}

const PERKS = [
  ['Sized by your bin', 'Every bag is named for the bin it fits. No guessing.'],
  ['Homes and businesses', 'Kitchens, shops, offices and commercial rolls.'],
  ['Repeat deliveries', 'Weekly, fortnightly or monthly. Never run out.'],
  ['Order on WhatsApp', 'No accounts, no apps. One message and you are done.'],
]

const STEPS = [
  ['Find your bin', 'Tap your bin size and we show the bag that fits.'],
  ['Build your order', 'Pick quantities, a delivery day and whether it repeats.'],
  ['Send on WhatsApp', 'We open a ready-made message. Press send to confirm.'],
  ['We deliver', 'Fresh stock at your door, once or on a schedule.'],
]

const FAQ = [
  ['How do I know which size fits my bin?', 'Sizes are named by the bin they fit, and litre sizes are approximate. Check against your bin, or tap a size under “Find your bin”. If unsure, message us on WhatsApp.'],
  ['What does gauge mean?', 'Gauge is the thickness of the plastic. Our bags are 100 gauge, which is 25 micron: strong enough for kitchen and office waste without tearing.'],
  ['Can I get another size?', 'Yes. We also make 20 × 26, 28 × 34, 40 × 40 and 40 × 50 in. Ask us for a price on WhatsApp.'],
  ['Can I set up a repeat delivery?', 'Yes. Pick weekly, every 2 weeks or monthly in the order form and we set it up when you send the message.'],
  ['Is anything sent automatically?', 'No. The order button opens WhatsApp with your message typed out. Nothing is sent until you press send.'],
]

export default function Site({ config }) {
  const { business, hero, repeats, delivery, payment, announcement } = config
  const products = useMemo(() => config.products.filter((p) => p.active), [config.products])
  const litres = [...new Set(products.map((p) => p.litres))].sort((a, b) => a - b)
  const maxL = Math.max(...litres)
  const phone = business.phone

  const [qty, setQty] = useState({}) // productId -> number of packs
  const [pack, setPack] = useState({}) // productId -> bags per pack chosen
  const [pick, setPick] = useState(null)
  const [form, setForm] = useState({ name: '', area: '', location: '', mapLink: '', contactName: '', contactPhone: '', date: '', time: 'Morning', repeat: repeats[0], notes: '' })
  const [other, setOther] = useState(false) // someone else receives the delivery
  const [geo, setGeo] = useState(null) // null | busy | ok | denied | fail | none
  const [today, setToday] = useState('')
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const locate = () => {
    if (!navigator.geolocation) return setGeo('none')
    setGeo('busy')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setForm((f) => ({ ...f, mapLink: mapsUrl(coords.latitude, coords.longitude) })); setGeo('ok') },
      (e) => setGeo(e.code === 1 ? 'denied' : 'fail'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }
  const mapBad = form.mapLink && !/^https?:\/\/\S+$/i.test(form.mapLink.trim())
  const bump = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }))
  const choose = (id, bags) => setPack((k) => ({ ...k, [id]: bags }))
  const lines = orderLines(products, qty, pack)
  // contact fields only count while the "someone else" box is ticked
  const order = buildOrder({ products, phone, qty, pack, ...form, mapLink: mapBad ? '' : form.mapLink.trim(), ...(other ? {} : { contactName: '', contactPhone: '' }) })
  const short = order && delivery.minOrderKes > order.total ? delivery.minOrderKes - order.total : 0
  const ready = order && !short
  const enquiry = (m = 'Hi Safi Bags, I have a question.') => waUrl(phone, m)

  const links = [['#range', 'Find your bin'], ['#how', 'How it works'], ['#faq', 'FAQ'], ['#contact', 'Contact']]

  return (
    <>
      <a className="skip" href="#order">Skip to order form</a>
      <Header part="homes" links={links} cta={['#order', 'Order now']} announcement={announcement} />

      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <p className="eyebrow"><span className="dot" /> Bin liners · {business.location}</p>
            <h1>
              <span className="line">{hero.line1}</span>
              <span className="line accent">{hero.line2}</span>
            </h1>
            <p className="lead">{hero.lead}</p>
            <div className="cta">
              <a className="btn lime" href="#order">Order now</a>
              <a className="btn ghost" href={enquiry()} target="_blank" rel="noreferrer"><WaIcon /> Ask on WhatsApp</a>
            </div>
            <dl className="stats">
              <div><dt>Sizes</dt><dd>{products.length}</dd></div>
              <div><dt>From</dt><dd>KES {Math.min(...products.flatMap((p) => p.packs.map(perBag)))}<small>/bag</small></dd></div>
              <div><dt>Bins</dt><dd>{litres[0]}–{maxL} L</dd></div>
            </dl>
          </div>
          <div className="hero-art">
            <div className="halo" />
            <Mark3D />
            <span className="tag t1">Kitchen</span>
            <span className="tag t2">Office</span>
            <span className="tag t3">Shop</span>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div>{Array(4).fill(['Clean starts here', 'Homes', 'Shops', 'Offices', 'Bulk orders welcome']).flat().map((t, i) => <span key={i}>{t}<i>✦</i></span>)}</div>
      </div>

      <section className="perks">
        <div className="wrap perk-grid">
          {PERKS.map(([t, d]) => (
            <div className="perk reveal" key={t}>
              <Mark size={28} />
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="range" id="range">
        <div className="wrap">
          <div className="head">
            <div>
              <p className="kicker">The range</p>
              <h2 className="reveal">Find your bin.<br /><span>Pick your bag.</span></h2>
            </div>
            <div className="finder">
              <p id="finder-label">How big is your bin?</p>
              <div className="chips" role="group" aria-labelledby="finder-label">
                <button type="button" className={pick === null ? 'on' : ''} aria-pressed={pick === null} onClick={() => setPick(null)}>All</button>
                {litres.map((l) => (
                  <button key={l} type="button" className={pick === l ? 'on' : ''} aria-pressed={pick === l} onClick={() => setPick(l)}>~{l} L</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid">
            {products.map((p) => {
              const n = qty[p.id] || 0
              const k = packFor(p, pack[p.id])
              return (
                <article className={`card${pick !== null && pick !== p.litres ? ' dim' : ''}${pick === p.litres ? ' hit' : ''}`} key={p.id}>
                  <div className="art">
                    <span className="fits">~{p.litres} L bin</span>
                    <BagArt litres={p.litres} max={maxL} />
                  </div>
                  <div className="body">
                    <h3>{p.name}</h3>
                    <dl>
                      <div><dt>Size</dt><dd>{p.size}</dd></div>
                      {p.gauge && <div><dt>Gauge</dt><dd>{p.gauge}</dd></div>}
                    </dl>
                    <PackPicker p={p} value={k.bags} onPick={(b) => choose(p.id, b)} />
                    <div className="buy">
                      <strong>KES {k.price.toLocaleString()}<small> / {k.bags} bags · KES {perBag(k)}/bag</small></strong>
                      {n ? (
                        <div className="stepper sm">
                          <button type="button" onClick={() => bump(p.id, -1)} aria-label={`One pack fewer of ${p.name}`}>−</button>
                          <output aria-label={`${p.name} packs`}>{n}</output>
                          <button type="button" onClick={() => bump(p.id, 1)} aria-label={`One pack more of ${p.name}`}>+</button>
                        </div>
                      ) : (
                        <button type="button" className="add" onClick={() => bump(p.id, 1)}>Add pack</button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="more">Need another size? We also make 20 × 26, 28 × 34, 40 × 40 and 40 × 50 in. <a href={enquiry('Hi Safi Bags, I need a different size.')} target="_blank" rel="noreferrer">Ask us for a price →</a></p>
        </div>
      </section>

      <section className="split">
        <div className="panel lime">
          <div className="panel-in">
            <p className="kicker">For homes</p>
            <h3>Never run out of bin bags again.</h3>
            <p>Kitchen and everyday sizes, delivered on a schedule that suits your household.</p>
            <a className="btn dark" href="#order">Schedule a delivery</a>
          </div>
        </div>
        <div className="panel dark">
          <div className="panel-in">
            <p className="kicker">For businesses</p>
            <h3>Stock for shops, offices and sites.</h3>
            <p>Big bin and commercial rolls with bulk pricing. Tell us what you go through and we will quote.</p>
            <Link className="btn lime" href="/industries/">See business range →</Link>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="wrap">
          <p className="kicker">How it works</p>
          <h2 className="reveal">Four steps, <span>one chat.</span></h2>
          <ol className="steps">
            {STEPS.map(([t, d], i) => (
              <li className="reveal" key={t}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="order" id="order">
        <div className="wrap order-in">
          <div className="order-form">
            <p className="kicker">Order or schedule</p>
            <h2>Build your order</h2>
            <p className="sub">Choose your bags and when you want them. We open WhatsApp with the message ready, nothing is sent until you press send.</p>

            <fieldset>
              <legend><span>1</span> Bags</legend>
              <div className="rows">
                {products.map((p) => {
                  const k = packFor(p, pack[p.id])
                  return (
                    <div className={`row${qty[p.id] ? ' has' : ''}`} key={p.id}>
                      <div className="row-info">
                        <b>{p.name}</b>
                        <small>{[p.size, p.gauge && `${p.gauge} gauge`].filter(Boolean).join(' · ')}</small>
                        {p.packs.length > 1 ? (
                          <select value={k.bags} onChange={(e) => choose(p.id, Number(e.target.value))} aria-label={`${p.name} pack size`}>
                            {p.packs.map((o) => <option key={o.bags} value={o.bags}>Pack of {o.bags} · KES {o.price.toLocaleString()}</option>)}
                          </select>
                        ) : (
                          <small>Pack of {k.bags} · KES {k.price.toLocaleString()}</small>
                        )}
                      </div>
                      <div className="stepper">
                        <button type="button" onClick={() => bump(p.id, -1)} aria-label={`One pack fewer of ${p.name}`}>−</button>
                        <output aria-label={`${p.name} packs`}>{qty[p.id] || 0}</output>
                        <button type="button" onClick={() => bump(p.id, 1)} aria-label={`One pack more of ${p.name}`}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend><span>2</span> Delivery</legend>
              <div className="fields">
                <label>Your name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
                <label>Area<input value={form.area} onChange={set('area')} placeholder="e.g. Kilimani" autoComplete="address-level2" /></label>
                <label className="wide">Delivery location
                  <input value={form.location} onChange={set('location')} placeholder="Building, street, gate, floor or landmark" autoComplete="street-address" />
                </label>
                <div className="wide map">
                  <label htmlFor="maplink">Google Maps pin <small>(optional, helps the rider find you)</small></label>
                  <div className="map-row">
                    <input id="maplink" type="url" inputMode="url" value={form.mapLink} onChange={set('mapLink')} placeholder="Paste a maps link" />
                    <button type="button" className="locate" onClick={locate} disabled={geo === 'busy'}>
                      <PinIcon /> {geo === 'busy' ? 'Finding you…' : 'Use my location'}
                    </button>
                  </div>
                  {mapBad && <small className="bad">That doesn&apos;t look like a link. It should start with https://</small>}
                  {geo && geo !== 'busy' && <small className={geo === 'ok' ? 'good' : 'bad'}>{GEO_MSG[geo]}</small>}
                  {form.mapLink && !mapBad && <a className="peek" href={form.mapLink} target="_blank" rel="noreferrer">Check pin on map ↗</a>}
                </div>
                <label>Date<input type="date" min={today} value={form.date} onChange={set('date')} /></label>
                <label>Time<select value={form.time} onChange={set('time')}><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
              </div>

              <label className="check">
                <input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} />
                Someone else will receive the delivery
              </label>
              {other && (
                <div className="fields contact">
                  <label>Contact name<input value={form.contactName} onChange={set('contactName')} placeholder="Who should the rider ask for?" /></label>
                  <label>Contact phone<input type="tel" inputMode="tel" value={form.contactPhone} onChange={set('contactPhone')} placeholder="07xx xxx xxx" autoComplete="off" /></label>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend><span>3</span> Repeat</legend>
              <div className="seg" role="radiogroup" aria-label="Repeat delivery">
                {repeats.map((r) => (
                  <label key={r} className={form.repeat === r ? 'on' : ''}>
                    <input type="radio" name="repeat" value={r} checked={form.repeat === r} onChange={set('repeat')} />{r}
                  </label>
                ))}
              </div>
              <label className="notes">Notes<textarea rows="2" value={form.notes} onChange={set('notes')} placeholder="Gate code, other sizes, bulk quantities…" /></label>
            </fieldset>
          </div>

          <aside className="summary" aria-live="polite">
            <h3>Your order</h3>
            {order ? (
              <>
                <ul>{lines.map((l) => <li key={l.id}><span>{l.n} × {l.name} <small>(pack of {l.pack.bags})</small></span><b>KES {l.cost.toLocaleString()}</b></li>)}</ul>
                <div className="sum-total"><span>Total</span><b>KES {order.total.toLocaleString()}</b></div>
                {(form.area || form.location) && <p className="meta">📍 {[form.area, form.location].filter(Boolean).join(' · ')}{form.mapLink && !mapBad ? ' · pin added' : ''}</p>}
                {other && (form.contactName || form.contactPhone) && <p className="meta">👤 {[form.contactName, form.contactPhone].filter(Boolean).join(', ')}</p>}
                {form.date && <p className="meta">📅 {prettyDate(form.date)} · {form.time}{form.repeat !== repeats[0] ? ` · ${form.repeat}` : ''}</p>}
                <details className="wa-prev">
                  <summary>Preview WhatsApp message</summary>
                  <div className="wa-chat">
                    <div className="wa-bubble">{waFormat(order.text)}<span className="wa-tick" aria-hidden="true">✓✓</span></div>
                  </div>
                </details>
              </>
            ) : (
              <div className="empty"><Mark size={44} /><p>Add packs to start.</p></div>
            )}
            {short > 0 && <p className="warn">Minimum order is KES {delivery.minOrderKes.toLocaleString()}. Add KES {short.toLocaleString()} more.</p>}
            <a className={`btn lime block${ready ? '' : ' off'}`} aria-disabled={!ready} href={ready ? order.url : undefined} target="_blank" rel="noreferrer"><WaIcon /> Send on WhatsApp</a>
            {(delivery.areas || delivery.note || payment) && (
              <div className="info">
                {delivery.areas && <p><b>Delivery</b> {delivery.areas}</p>}
                {delivery.note && <p>{delivery.note}</p>}
                {payment && <p><b>Pay by</b> {payment}</p>}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="wrap faq-in">
          <div>
            <p className="kicker">Questions</p>
            <h2 className="reveal">Good to know</h2>
            <p className="sub">Something else? <a href={enquiry()} target="_blank" rel="noreferrer">Ask us on WhatsApp</a>.</p>
          </div>
          <div className="qa">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      <section className="band">
        <div className="wrap band-in">
          <h2>Clean starts here.</h2>
          <a className="btn dark" href="#order">Order now</a>
        </div>
      </section>

      <Footer business={business} blurb="Bin liners for homes and businesses across Kenya." />

      {/* mobile: running total once there is something to order, otherwise a WhatsApp shortcut */}
      {order ? (
        <div className="mbar">
          <div><small>{order.bags} bags</small><b>KES {order.total.toLocaleString()}</b></div>
          <a className="btn lime sm" href="#order">Review & send</a>
        </div>
      ) : (
        <a className="fab" href={enquiry()} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><WaIcon /></a>
      )}
    </>
  )
}
