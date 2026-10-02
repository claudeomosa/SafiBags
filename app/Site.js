'use client'
import { useEffect, useMemo, useState } from 'react'
import { buildOrder, waUrl, prettyPhone, prettyDate, mapsUrl } from '../lib/order'
import Mark3D from './Mark3D'

// Brand mark from the identity board: tied bag + lime spark
const Mark = ({ bag = 'currentColor', spark = '#B4E12B', size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <path fill={bag} d="M13 25C13 22 15 21 18 21H46C49 21 51 22 51 25L54.5 53C55 58 52 60 48 60H16C12 60 9 58 9.5 53Z" />
    <path fill={bag} d="M32 21C27 10 16 9 17 16C18 21 26 22 32 21Z" />
    <path fill={bag} d="M32 21C37 10 48 9 47 16C46 21 38 22 32 21Z" />
    <path fill={spark} d="M32 31C33 36 35 38 41 40C35 42 33 44 32 49C31 44 29 42 23 40C29 38 31 36 32 31Z" />
  </svg>
)

const Logo = () => (
  <a href="#top" className="logo" aria-label="Safi Bags home">
    <Mark bag="#B4E12B" spark="#14213D" size={34} />
    <span>safi<b>BAGS</b></span>
  </a>
)

const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
)

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
)

// Follows the device setting until the visitor picks one; the choice is saved and
// applied before paint by the inline script in layout.js.
function ThemeToggle() {
  const [dark, setDark] = useState(null) // null until mounted, avoids a hydration mismatch
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      const t = document.documentElement.dataset.theme
      setDark(t ? t === 'dark' : mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const flip = () => {
    const t = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('theme', t) } catch {}
    setDark(!dark)
  }
  return (
    <button type="button" className="theme" onClick={flip} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  )
}

// Render WhatsApp's *bold* and _italic_ so the preview looks like the real chat
const waFormat = (text) =>
  text.split(/(\*[^*\n]+\*|_[^_\n]+_)/).map((s, i) =>
    s.length > 2 && s[0] === '*' && s.at(-1) === '*' ? <b key={i}>{s.slice(1, -1)}</b>
      : s.length > 2 && s[0] === '_' && s.at(-1) === '_' ? <i key={i}>{s.slice(1, -1)}</i>
        : s)

const GEO_MSG = {
  ok: 'Pin added from your current location.',
  denied: 'Location permission was blocked. Paste a maps link instead.',
  fail: 'Could not get your location. Paste a maps link instead.',
  none: 'Your browser cannot share location. Paste a maps link instead.',
}

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
  ['What is the difference between Everyday and Everyday Strong?', 'Same 24 × 36 in size. Strong is the heavier 100 g bag for tougher loads.'],
  ['Can I get another size?', 'Yes. We also make 20 × 26, 28 × 34, 40 × 40 and 40 × 50 in. Ask us for a price on WhatsApp.'],
  ['Can I set up a repeat delivery?', 'Yes. Pick weekly, every 2 weeks or monthly in the order form and we set it up when you send the message.'],
  ['Is anything sent automatically?', 'No. The order button opens WhatsApp with your message typed out. Nothing is sent until you press send.'],
]

export default function Site({ config }) {
  const { business, hero, repeats, delivery, payment, announcement, orderStep } = config
  const products = useMemo(() => config.products.filter((p) => p.active), [config.products])
  const litres = [...new Set(products.map((p) => p.litres))].sort((a, b) => a - b)
  const maxL = Math.max(...litres)
  const phone = business.phone
  const phone2 = business.phone2

  const [qty, setQty] = useState({})
  const [pick, setPick] = useState(null)
  const [menu, setMenu] = useState(false)
  const [form, setForm] = useState({ name: '', area: '', location: '', mapLink: '', contactName: '', contactPhone: '', date: '', time: 'Morning', repeat: repeats[0], notes: '' })
  const [other, setOther] = useState(false) // someone else receives the delivery
  const [geo, setGeo] = useState(null) // null | busy | ok | denied | fail | none
  const [today, setToday] = useState('')
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), [])
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [menu])

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
  const add = (id) => !qty[id] && bump(id, orderStep)
  // contact fields only count while the "someone else" box is ticked
  const order = buildOrder({ products, phone, qty, ...form, mapLink: mapBad ? '' : form.mapLink.trim(), ...(other ? {} : { contactName: '', contactPhone: '' }) })
  const bags = Object.values(qty).reduce((a, b) => a + b, 0)
  const short = order && delivery.minOrderKes > order.total ? delivery.minOrderKes - order.total : 0
  const ready = order && !short
  const enquiry = (m = 'Hi Safi Bags, I have a question.') => waUrl(phone, m)

  const links = [['#range', 'Find your bin'], ['#how', 'How it works'], ['#faq', 'FAQ'], ['#contact', 'Contact']]

  return (
    <>
      <a className="skip" href="#order">Skip to order form</a>
      {announcement && <div className="announce">{announcement}</div>}

      <header className="nav" id="top">
        <div className="wrap nav-in">
          <Logo />
          <nav className={menu ? 'open' : ''} aria-label="Main">
            {links.map(([h, t]) => <a key={h} href={h} onClick={() => setMenu(false)}>{t}</a>)}
            <a className="btn lime sm" href="#order" onClick={() => setMenu(false)}>Order now</a>
          </nav>
          <div className="nav-end">
            <ThemeToggle />
            <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span /><span />
            </button>
          </div>
        </div>
      </header>

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
              <div><dt>From</dt><dd>KES {Math.min(...products.map((p) => p.price))}<small>/bag</small></dd></div>
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
                      <div><dt>Weight</dt><dd>{p.weight}</dd></div>
                    </dl>
                    <div className="buy">
                      <strong>KES {p.price}<small>/bag</small></strong>
                      {n ? (
                        <div className="stepper sm">
                          <button type="button" onClick={() => bump(p.id, -orderStep)} aria-label={`Fewer ${p.name}`}>−</button>
                          <output>{n}</output>
                          <button type="button" onClick={() => bump(p.id, orderStep)} aria-label={`More ${p.name}`}>+</button>
                        </div>
                      ) : (
                        <button type="button" className="add" onClick={() => add(p.id)}>Add {orderStep}</button>
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
            <a className="btn lime" href={enquiry('Hi Safi Bags, I want a bulk quote.')} target="_blank" rel="noreferrer">Get a bulk quote</a>
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
                {products.map((p) => (
                  <div className={`row${qty[p.id] ? ' has' : ''}`} key={p.id}>
                    <div><b>{p.name}</b><small>{p.size} · KES {p.price}/bag</small></div>
                    <div className="stepper">
                      <button type="button" onClick={() => bump(p.id, -orderStep)} aria-label={`Fewer ${p.name}`}>−</button>
                      <output aria-label={`${p.name} quantity`}>{qty[p.id] || 0}</output>
                      <button type="button" onClick={() => bump(p.id, orderStep)} aria-label={`More ${p.name}`}>+</button>
                    </div>
                  </div>
                ))}
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
                <ul>{products.filter((p) => qty[p.id] > 0).map((p) => <li key={p.id}><span>{qty[p.id]} × {p.name}</span><b>KES {(qty[p.id] * p.price).toLocaleString()}</b></li>)}</ul>
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
              <div className="empty"><Mark size={44} /><p>Add bags to start. Bags go up in {orderStep}s.</p></div>
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

      <footer id="contact">
        <div className="wrap foot">
          <div>
            <Logo />
            <p>Bin liners for homes and businesses across Kenya.</p>
          </div>
          <div>
            <h4>Talk to us</h4>
            <a href={enquiry()} target="_blank" rel="noreferrer">WhatsApp {prettyPhone(phone)}</a>
            <a href={`tel:+${phone}`}>Call {prettyPhone(phone)}</a>
            {phone2 && <a href={`tel:+${phone2}`}>Also {prettyPhone(phone2)}</a>}
            {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
          </div>
          <div>
            <h4>Find us</h4>
            <p>{business.location}</p>
            <p>Bulk orders welcome</p>
          </div>
        </div>
        <p className="wrap copy">© {new Date().getFullYear()} Safi Bags</p>
      </footer>

      {/* mobile: running total once there is something to order, otherwise a WhatsApp shortcut */}
      {order ? (
        <div className="mbar">
          <div><small>{bags} bags</small><b>KES {order.total.toLocaleString()}</b></div>
          <a className="btn lime sm" href="#order">Review & send</a>
        </div>
      ) : (
        <a className="fab" href={enquiry()} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><WaIcon /></a>
      )}
    </>
  )
}
