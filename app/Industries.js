'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { buildQuote, enquiryText, waUrl, sizeCm, micron } from '../lib/order'
import { Mark, WaIcon, waFormat, Header, Footer } from './shared'

const kes = (n) => `KES ${n.toLocaleString('en-KE')}`

const FAQ = [
  ['Can I see a sample before ordering in bulk?', 'Ask in your quote request notes. We will confirm what we can send and how soon.'],
  ['Do you supply on invoice?', 'Tick “We need an invoice” and add your KRA PIN. We confirm invoicing and payment terms with your quote.'],
  ['Can you deliver on a schedule?', 'Yes. Choose weekly, every 2 weeks or monthly and we plan deliveries around it.'],
  ['What does gauge mean?', 'Gauge is the thickness of the plastic. 100 gauge is 25 micron. Higher gauge means a thicker, stronger bag.'],
  ['My size or colour isn’t listed', 'Add it in the notes of your quote request. We also make sizes on request.'],
]

export default function Industries({ config }) {
  const { business, repeats, payment, announcement, industries } = config
  const { hero, sectors, printing } = industries
  const products = useMemo(() => industries.products.filter((p) => p.active), [industries.products])
  const categories = [...new Set(products.map((p) => p.category))]
  const phone = business.phone

  const [cat, setCat] = useState(null)
  const [qty, setQty] = useState({})
  const [form, setForm] = useState({ company: '', contact: '', sector: '', area: '', location: '', mapLink: '', frequency: repeats[0], date: '', printing: false, printDetails: '', invoice: false, kraPin: '', notes: '' })
  const [today, setToday] = useState('')
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  // steps of 1, but never below the product's minimum order: from 0 jump to the MOQ, below it back to 0
  const bump = (p, d) => setQty((q) => {
    const min = p.moq || 1
    let n = (q[p.id] || 0) + d
    if (d > 0 && n < min) n = min
    if (d < 0 && n < min) n = 0
    return { ...q, [p.id]: n }
  })
  const pickSector = (name) => setForm((f) => ({ ...f, sector: name }))

  const mapBad = form.mapLink && !/^https?:\/\/\S+$/i.test(form.mapLink.trim())
  const quote = buildQuote({ products, phone, qty, ...form, mapLink: mapBad ? '' : form.mapLink.trim(), printing: printing.on && form.printing, kraPin: form.invoice ? form.kraPin : '' })
  const enquiry = (m = 'Hi Safi Bags, I have a business enquiry.') => waUrl(phone, m)
  const shown = cat ? products.filter((p) => p.category === cat) : products

  const links = [['#sectors', 'Sectors'], ['#catalogue', 'Products'], ['#process', 'How it works'], ['#faq', 'FAQ']]

  return (
    <div className="biz">
      <a className="skip" href="#quote">Skip to quote request</a>
      <Header part="business" links={links} cta={['#quote', 'Request a quote']} announcement={announcement} />

      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <p className="eyebrow biz-tag">For business · {business.location}</p>
            <h1 className="biz-h1">{hero.title}</h1>
            <p className="lead">{hero.lead}</p>
            <div className="cta">
              <a className="btn lime" href="#quote">Request a quote</a>
              <a className="btn ghost" href={enquiry()} target="_blank" rel="noreferrer"><WaIcon /> Talk to sales</a>
            </div>
            <dl className="stats">
              <div><dt>Products</dt><dd>{products.length}</dd></div>
              <div><dt>Bag types</dt><dd>{categories.length}</dd></div>
              <div><dt>Quotes</dt><dd>On WhatsApp</dd></div>
            </dl>
          </div>

          <div className="spec" aria-label="Spec sheet preview">
            <div className="spec-head"><Mark bag="#B4E12B" spark="#14213D" size={28} /><b>Spec sheet</b><span>Safi Bags</span></div>
            <table>
              <thead><tr><th>Size</th><th>Gauge</th><th>Unit</th><th>Price</th></tr></thead>
              <tbody>
                {products.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td>{p.size || p.name}</td>
                    <td>{p.gauge || '—'}</td>
                    <td>{p.unit}</td>
                    <td>{p.price ? kes(p.price) : 'Quote'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href="#catalogue" className="spec-more">Full range ↓</a>
          </div>
        </div>
      </section>

      <section className="sectors" id="sectors">
        <div className="wrap">
          <p className="kicker">Who we supply</p>
          <h2 className="reveal">Built for <span>busy bins.</span></h2>
          <div className="sector-grid">
            {sectors.map((s) => (
              <a key={s.name} href="#quote" className="sector reveal" onClick={() => pickSector(s.name)}>
                <Mark size={26} />
                <h3>{s.name}</h3>
                <p>{s.text}</p>
                <em>Get a quote →</em>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="catalogue" id="catalogue">
        <div className="wrap">
          <div className="head">
            <div>
              <p className="kicker">Product range</p>
              <h2 className="reveal">Specs you can <span>order by.</span></h2>
            </div>
          </div>
          {categories.length > 1 && (
            <div className="typefilter">
              <p id="type-label">Type of bag</p>
              <div className="chips" role="group" aria-labelledby="type-label">
                <button type="button" className={cat === null ? 'on' : ''} aria-pressed={cat === null} onClick={() => setCat(null)}>All <span>{products.length}</span></button>
                {categories.map((c) => (
                  <button key={c} type="button" className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>
                    {c} <span>{products.filter((p) => p.category === c).length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="icards">
            {shown.map((p) => {
              const n = qty[p.id] || 0
              return (
                <article className={`icard${n ? ' has' : ''}`} key={p.id}>
                  <span className="icat">{p.category}</span>
                  <h3>{p.name}</h3>
                  {p.details && <p className="idetails">{p.details}</p>}
                  {(p.size || p.gauge || p.colour || p.unit) && (
                    <dl>
                      {p.size && <div><dt>Size</dt><dd>{p.size}{sizeCm(p.size) && <small>{sizeCm(p.size)}</small>}</dd></div>}
                      {p.gauge && <div><dt>Gauge</dt><dd>{p.gauge}{micron(p.gauge) && <small>{micron(p.gauge)} micron</small>}</dd></div>}
                      {p.colour && <div><dt>Colour</dt><dd>{p.colour}</dd></div>}
                      {p.unit && <div><dt>Sold as</dt><dd>{p.unit}{p.moq && <small>Min. {p.moq}</small>}</dd></div>}
                    </dl>
                  )}
                  {!p.price && (
                    <a className="btn lime sm enquire" href={waUrl(phone, enquiryText(p))} target="_blank" rel="noreferrer"><WaIcon /> Enquire on WhatsApp</a>
                  )}
                  <div className="ibuy">
                    {p.price ? <strong>{kes(p.price)}<small>{p.unit ? ` / ${p.unit.toLowerCase()}` : ''}</small></strong> : <span className="onquote-note">Or add it to a quote with other items</span>}
                    {n ? (
                      <div className="stepper sm">
                        <button type="button" onClick={() => bump(p, -1)} aria-label={`Fewer ${p.name}`}>−</button>
                        <output aria-label={`${p.name} quantity`}>{n}</output>
                        <button type="button" onClick={() => bump(p, 1)} aria-label={`More ${p.name}`}>+</button>
                      </div>
                    ) : (
                      <button type="button" className={p.price ? 'add' : 'add soft'} onClick={() => bump(p, 1)}>{p.price ? 'Add to quote' : '+ Quote'}</button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
          <p className="more">Need a size, colour or gauge that isn’t listed? <a href="#quote">Add it to your quote notes →</a></p>
        </div>
      </section>

      {printing.on && (
        <section className="printing">
          <div className="wrap printing-in">
            <div>
              <p className="kicker">Custom printing</p>
              <h2>Your brand on <span>every bag.</span></h2>
              <p className="sub">{printing.text}</p>
            </div>
            <a className="btn lime" href="#quote" onClick={() => setForm((f) => ({ ...f, printing: true }))}>Ask about printing</a>
          </div>
        </section>
      )}

      <section className="how" id="process">
        <div className="wrap">
          <p className="kicker">How bulk orders work</p>
          <h2 className="reveal">From quote to <span>delivery.</span></h2>
          <ol className="steps">
            {[
              ['Request a quote', 'Pick products and quantities, tell us where and how often.'],
              ['We confirm', 'We reply on WhatsApp with prices, stock and delivery dates.'],
              ['Approve & pay', payment ? `Pay as agreed: ${payment}.` : 'Approve the quote and pay as agreed.'],
              ['Scheduled delivery', 'We deliver once or on your schedule.'],
            ].map(([t, d], i) => (
              <li className="reveal" key={t}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="order" id="quote">
        <div className="wrap order-in">
          <div className="order-form">
            <p className="kicker">Request a quote</p>
            <h2>Tell us what you need</h2>
            <p className="sub">We open WhatsApp with your request ready. Nothing is sent until you press send.</p>

            <fieldset>
              <legend><span>1</span> Products</legend>
              {!products.some((p) => qty[p.id] > 0) && <p className="pick-hint">Add products from the <a href="#catalogue">range above</a>, or describe what you need in the notes.</p>}
              <div className="rows">
                {products.filter((p) => qty[p.id] > 0).map((p) => (
                  <div className={`row${qty[p.id] ? ' has' : ''}`} key={p.id}>
                    <div className="row-info">
                      <b>{p.name}</b>
                      <small>{[p.unit, p.price ? kes(p.price) : 'price on quote', p.moq && `min. ${p.moq}`].filter(Boolean).join(' · ')}</small>
                    </div>
                    <div className="stepper">
                      <button type="button" onClick={() => bump(p, -1)} aria-label={`Fewer ${p.name}`}>−</button>
                      <output aria-label={`${p.name} quantity`}>{qty[p.id] || 0}</output>
                      <button type="button" onClick={() => bump(p, 1)} aria-label={`More ${p.name}`}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend><span>2</span> Your business</legend>
              <div className="fields">
                <label>Company<input value={form.company} onChange={set('company')} autoComplete="organization" /></label>
                <label>Contact person<input value={form.contact} onChange={set('contact')} autoComplete="name" placeholder="Name and role" /></label>
                <label className="wide">Sector
                  <select value={form.sector} onChange={set('sector')}>
                    <option value="">Choose…</option>
                    {sectors.map((s) => <option key={s.name}>{s.name}</option>)}
                    <option>Other</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>3</span> Delivery</legend>
              <div className="fields">
                <label>Area<input value={form.area} onChange={set('area')} placeholder="e.g. Industrial Area" /></label>
                <label>First delivery<input type="date" min={today} value={form.date} onChange={set('date')} /></label>
                <label className="wide">Location<input value={form.location} onChange={set('location')} placeholder="Building, gate, loading bay" /></label>
                <label className="wide">Google Maps link <small>(optional)</small>
                  <input type="url" inputMode="url" value={form.mapLink} onChange={set('mapLink')} placeholder="Paste a maps link" />
                  {mapBad && <small className="bad">That doesn&apos;t look like a link. It should start with https://</small>}
                </label>
              </div>
              <div className="seg" role="radiogroup" aria-label="How often">
                {repeats.map((r) => (
                  <label key={r} className={form.frequency === r ? 'on' : ''}>
                    <input type="radio" name="frequency" value={r} checked={form.frequency === r} onChange={set('frequency')} />{r}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend><span>4</span> Requirements</legend>
              {printing.on && (
                <>
                  <label className="check"><input type="checkbox" checked={form.printing} onChange={set('printing')} /> We want custom printing</label>
                  {form.printing && <div className="fields contact"><label className="wide">Printing details<input value={form.printDetails} onChange={set('printDetails')} placeholder="Logo, colours, text" /></label></div>}
                </>
              )}
              <label className="check"><input type="checkbox" checked={form.invoice} onChange={set('invoice')} /> We need an invoice</label>
              {form.invoice && <div className="fields contact"><label className="wide">KRA PIN <small>(optional)</small><input value={form.kraPin} onChange={set('kraPin')} autoComplete="off" /></label></div>}
              <label className="notes">Notes<textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Other sizes, colours, samples, monthly volumes…" /></label>
            </fieldset>
          </div>

          <aside className="summary" aria-live="polite">
            <h3>Your quote request</h3>
            {quote ? (
              <>
                <ul>{products.filter((p) => qty[p.id] > 0).map((p) => <li key={p.id}><span>{qty[p.id]} × {p.name} {p.unit && <small>({p.unit})</small>}</span><b>{p.price ? kes(qty[p.id] * p.price) : 'Quote'}</b></li>)}</ul>
                {quote.total > 0 && <div className="sum-total"><span>Estimated</span><b>{kes(quote.total)}</b></div>}
                {quote.quoted && <p className="meta">Items marked “Quote” are priced in our reply.</p>}
                {form.company && <p className="meta">🏢 {form.company}{form.sector ? ` · ${form.sector}` : ''}</p>}
                <details className="wa-prev">
                  <summary>Preview WhatsApp message</summary>
                  <div className="wa-chat"><div className="wa-bubble">{waFormat(quote.text)}<span className="wa-tick" aria-hidden="true">✓✓</span></div></div>
                </details>
              </>
            ) : (
              <div className="empty"><Mark size={44} /><p>Add products to start your quote.</p></div>
            )}
            <a className={`btn lime block${quote ? '' : ' off'}`} aria-disabled={!quote} href={quote ? quote.url : undefined} target="_blank" rel="noreferrer"><WaIcon /> Send quote request</a>
            <p className="meta">Shopping for your home? <Link href="/">See home packs →</Link></p>
          </aside>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="wrap faq-in">
          <div>
            <p className="kicker">Business FAQ</p>
            <h2 className="reveal">Good to know</h2>
            <p className="sub">Something else? <a href={enquiry()} target="_blank" rel="noreferrer">Talk to sales on WhatsApp</a>.</p>
          </div>
          <div className="qa">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      <Footer business={business} blurb="Bin liners for homes and businesses across Kenya." />

      {quote ? (
        <div className="mbar">
          <div><small>{quote.units} items</small><b>{quote.total > 0 ? kes(quote.total) : 'On quote'}{quote.total > 0 && quote.quoted ? ' +' : ''}</b></div>
          <a className="btn lime sm" href="#quote">Review quote</a>
        </div>
      ) : (
        <a className="fab" href={enquiry()} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><WaIcon /></a>
      )}
    </div>
  )
}
