'use client'
import { useEffect, useRef, useState } from 'react'
import { migrate, validate } from '../../lib/config'
import { REPO, loadConfig, saveConfig, deployStatus } from '../../lib/github'

const KEY = 'sb_gh_token'

// What the admin is told after saving, per publishing state (see deployStatus)
const DEPLOY = {
  waiting: { tone: 'ok', text: 'Saved ✓ Publishing to the live site… this usually takes 2–3 minutes. You can keep editing.' },
  queued: { tone: 'ok', text: 'Saved ✓ Publishing to the live site… this usually takes 2–3 minutes. You can keep editing.' },
  building: { tone: 'ok', text: 'Saved ✓ Building the live site… almost there.' },
  live: { tone: 'ok', text: 'Live ✓ Your changes are on the site. Still seeing the old version? Refresh in a few minutes (browsers can cache it for up to 10 minutes).', site: true },
  replaced: { tone: 'ok', text: 'Saved ✓ A newer save is publishing these changes too.' },
  failed: { tone: 'err', text: 'Saved, but publishing failed, so the site still shows the previous version. Open the details or try saving again.' },
  unknown: { tone: 'ok', text: 'Saved ✓ Publishing is taking longer than usual, or its status is unavailable. Check the details.' },
}
const DONE = ['live', 'failed', 'replaced', 'unknown']
const POLL_MS = 20000
const POLL_MAX = 18 // ~6 minutes, then "taking longer than usual"
const blank = { name: '', litres: 60, size: '', gauge: '', packs: [{ bags: 10, price: '' }], active: true }
const blankBiz = { name: '', category: '', size: '', gauge: '', colour: '', details: '', unit: '', price: '', moq: '', active: true }
const TABS = [['homes', 'Homes site'], ['business', 'Business site'], ['contact', 'Contact & ordering']]
const NEW_TOKEN = 'https://github.com/settings/personal-access-tokens/new'

// Remembered only if the admin ticks "remember"; otherwise it lasts until the tab closes
const getToken = () => sessionStorage.getItem(KEY) || localStorage.getItem(KEY)
const forget = () => { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY) }

// A plain function, not a component: a component defined in render remounts each
// keystroke and the input loses focus.
const field = (cfg, up, { label, path, type = 'text', wide, hint }) => (
  <label key={path} className={wide ? 'wide' : ''}>{label}
    <input type={type} value={path.split('.').reduce((o, k) => o[k], cfg)} onChange={(e) => up(path, e.target.value)} />
    {hint && <small>{hint}</small>}
  </label>
)

export default function Panel() {
  const [token, setToken] = useState(null)
  const [input, setInput] = useState('')
  const [remember, setRemember] = useState(false)
  const [cfg, setCfg] = useState(null)
  const [sha, setSha] = useState(null)
  const [msg, setMsg] = useState(null) // { ok, text, link? }
  const [busy, setBusy] = useState(false)
  const [deploy, setDeploy] = useState(null) // { sha, state, url, commitUrl } for the last save
  const newest = useRef(null) // id of a just-added row's name input, focused once it renders
  const [tab, setTab] = useState('homes')

  const run = async (fn) => {
    setBusy(true); setMsg(null)
    try { await fn() } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }
  const open = (t) => run(async () => {
    try {
      const r = await loadConfig(t)
      setToken(t); setCfg(migrate(r.cfg)); setSha(r.sha) // migrate: settings saved in an older format
    } catch (e) {
      forget() // never keep a token GitHub rejected
      throw e
    }
  })
  useEffect(() => { const t = getToken(); if (t) open(t) }, [])

  const signIn = (e) => {
    e.preventDefault()
    const t = input.trim()
    ;(remember ? localStorage : sessionStorage).setItem(KEY, t)
    setInput('')
    open(t)
  }
  const signOut = () => { forget(); setToken(null); setCfg(null); setMsg(null) }
  const reload = () => open(token)
  const save = () => run(async () => {
    const clean = validate(cfg) // same check CI runs before deploying
    const r = await saveConfig(token, clean, sha)
    setCfg(clean); setSha(r.sha)
    setDeploy({ sha: r.commitSha, state: 'waiting', commitUrl: r.commitUrl })
  })

  // Follow the last save until it is live (or failed), so the admin knows when visitors will see it
  useEffect(() => {
    if (!deploy || DONE.includes(deploy.state)) return
    let tries = 0
    const id = setInterval(async () => {
      tries++
      const s = await deployStatus(deploy.sha)
      let state = s.state
      if (state === 'unknown' && tries < POLL_MAX) state = deploy.state // brief API hiccup: keep showing progress
      else if (tries >= POLL_MAX && !DONE.includes(state)) state = 'unknown' // give up waiting, link to details
      setDeploy((d) => (d?.sha === deploy.sha ? { ...d, state, url: s.url || d.url } : d))
    }, POLL_MS)
    return () => clearInterval(id)
  }, [deploy?.sha, deploy?.state])

  const up = (path, v) => setCfg((c) => {
    const n = structuredClone(c); let o = n; const k = path.split('.')
    k.slice(0, -1).forEach((p) => (o = o[p])); o[k.at(-1)] = v; return n
  })
  const setProduct = (i, k, v) => up(`products.${i}.${k}`, v)
  const addProduct = () => { up('products', [...cfg.products, structuredClone(blank)]); newest.current = `pname-${cfg.products.length}` }
  const rmProduct = (i) => up('products', cfg.products.filter((_, j) => j !== i))
  const setPack = (i, j, k, v) => up(`products.${i}.packs.${j}.${k}`, v)
  const addPack = (i) => up(`products.${i}.packs`, [...cfg.products[i].packs, { bags: '', price: '' }])
  const rmPack = (i, j) => up(`products.${i}.packs`, cfg.products[i].packs.filter((_, x) => x !== j))
  const biz = cfg?.industries
  const setBiz = (i, k, v) => up(`industries.products.${i}.${k}`, v)
  const addBiz = () => { up('industries.products', [...biz.products, { ...blankBiz, category: biz.products.at(-1)?.category || '' }]); newest.current = `bname-${biz.products.length}` }
  const rmBiz = (i) => up('industries.products', biz.products.filter((_, j) => j !== i))
  const addSector = () => { up('industries.sectors', [...biz.sectors, { name: '', text: '' }]); newest.current = `sname-${biz.sectors.length}` }
  const rmSector = (i) => up('industries.sectors', biz.sectors.filter((_, j) => j !== i))
  useEffect(() => {
    if (newest.current === null) return
    const el = document.getElementById(newest.current)
    newest.current = null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus({ preventScroll: true })
  }, [cfg?.products.length, biz?.products.length, biz?.sectors.length])
  const F = (props) => field(cfg, up, props)

  if (!cfg) {
    return (
      <main className="adm">
        <form className="login" onSubmit={signIn}>
          <h1>Safi Bags admin</h1>
          <p className="hint">Sign in with a GitHub access token. Saving commits the settings to <b>{REPO}</b> and the site redeploys.</p>
          <label>GitHub token<input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} placeholder="github_pat_…" /></label>
          <label className="chk"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device</label>
          <button className="btn lime" disabled={busy || !input.trim()}>{busy ? 'Checking…' : 'Sign in'}</button>
          {msg && <p className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</p>}
          <details className="howto">
            <summary>How do I get a token?</summary>
            <ol>
              <li>Open <a href={NEW_TOKEN} target="_blank" rel="noreferrer">GitHub → new fine-grained token</a>.</li>
              <li>Repository access: <b>Only select repositories</b> → <b>SafiBags</b>.</li>
              <li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else.</li>
              <li>Pick an expiry, generate, and paste it here.</li>
            </ol>
          </details>
        </form>
      </main>
    )
  }

  return (
    <main className="adm">
      <header className="adm-bar">
        <h1>Safi Bags admin</h1>
        <div>
          <a href="../" target="_blank" rel="noreferrer">View site ↗</a>{' '}
          <button className="link" onClick={reload} disabled={busy}>Reload</button>{' '}
          <button className="link" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}
      </div>

      {tab === 'contact' && <>
      <section><h2>Contact details</h2><div className="f2">
        {F({ label: 'Main WhatsApp number (receives orders)', path: 'business.phone', hint: 'Country code, digits only, e.g. 254768014285' })}
        {F({ label: 'Secondary number (optional)', path: 'business.phone2', hint: 'Shown in the footer as an extra contact' })}
        {F({ label: 'Email (optional)', path: 'business.email' })}
        {F({ label: 'Location', path: 'business.location' })}
        {F({ label: 'Opening hours (optional)', path: 'business.hours', hint: 'e.g. Mon–Sat 8am–5pm. Shown in the footer' })}
        {F({ label: 'Announcement bar (empty to hide)', path: 'announcement', hint: 'Shown on both sites' })}
      </div></section>

      <section><h2>Ordering and delivery</h2><div className="f2">
        {F({ label: 'Minimum order for homes (KES, 0 = none)', path: 'delivery.minOrderKes', type: 'number' })}
        {F({ label: 'Delivery areas', path: 'delivery.areas', wide: true })}
        {F({ label: 'Delivery note (e.g. delivery time)', path: 'delivery.note', wide: true })}
        {F({ label: 'Payment options (empty to hide)', path: 'payment', wide: true, hint: 'Shown as “Pay by …”, e.g. M-Pesa, cash on delivery. Used on both sites' })}
        <label className="wide">Repeat / delivery frequency options (one per line, first is the default one-off)
          <textarea rows="5" value={cfg.repeats.join('\n')} onChange={(e) => up('repeats', e.target.value.split('\n'))} />
        </label>
      </div></section>
      </>}

      {tab === 'homes' && <>
      <section><h2>Homepage hero</h2><div className="f2">
        {F({ label: 'Headline line 1', path: 'hero.line1' })}
        {F({ label: 'Headline line 2', path: 'hero.line2' })}
        {F({ label: 'Intro text', path: 'hero.lead', wide: true })}
      </div></section>

      <section><h2>Products, pack sizes and prices</h2>
        <div className="ptable">
          {cfg.products.map((p, i) => (
            <div className="pcard" key={i}>
              <div className="prow">
                <label>Name<input id={`pname-${i}`} value={p.name} onChange={(e) => setProduct(i, 'name', e.target.value)} placeholder="e.g. Jumbo bin" /></label>
                <label>Bin litres<input type="number" min="0" inputMode="numeric" value={p.litres} onChange={(e) => setProduct(i, 'litres', e.target.value)} /></label>
                <label>Size<input value={p.size} onChange={(e) => setProduct(i, 'size', e.target.value)} placeholder="24 × 36 in" /></label>
                <label>Gauge<input value={p.gauge} onChange={(e) => setProduct(i, 'gauge', e.target.value)} placeholder="e.g. 100" /></label>
                <label className="chk"><input type="checkbox" checked={p.active} onChange={(e) => setProduct(i, 'active', e.target.checked)} /> Shown on site</label>
                <button className="link danger" onClick={() => rmProduct(i)} disabled={cfg.products.length < 2}>Remove product</button>
              </div>
              <div className="packs-edit">
                <p className="ph">Pack sizes and prices</p>
                {p.packs.map((k, j) => {
                  const each = Number(k.bags) > 0 && Number(k.price) > 0 ? Math.round((k.price / k.bags) * 100) / 100 : null
                  return (
                    <div className="pk" key={j}>
                      <label>Bags per pack<input type="number" min="1" step="1" inputMode="numeric" value={k.bags} onChange={(e) => setPack(i, j, 'bags', e.target.value)} /></label>
                      <label>Price per pack (KES)<input type="number" min="0" step="1" inputMode="decimal" value={k.price} onChange={(e) => setPack(i, j, 'price', e.target.value)} /></label>
                      <span className="each">{each !== null ? `= KES ${each} per bag` : ''}</span>
                      <button className="link danger" onClick={() => rmPack(i, j)} disabled={p.packs.length < 2}>Remove</button>
                    </div>
                  )
                })}
                <button className="link" onClick={() => addPack(i)}>+ Add pack size</button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn ghost-d" onClick={addProduct}>+ Add product</button>
      </section>
      </>}

      {tab === 'business' && <>
      <section><h2>Business page hero</h2><div className="f2">
        {F({ label: 'Headline', path: 'industries.hero.title', wide: true })}
        {F({ label: 'Intro text', path: 'industries.hero.lead', wide: true })}
      </div></section>

      <section><h2>Sectors you supply</h2>
        {biz.sectors.map((x, i) => (
          <div className="srow" key={i}>
            <label>Sector<input id={`sname-${i}`} value={x.name} onChange={(e) => up(`industries.sectors.${i}.name`, e.target.value)} placeholder="e.g. Hospitals & clinics" /></label>
            <label>Short description<input value={x.text} onChange={(e) => up(`industries.sectors.${i}.text`, e.target.value)} /></label>
            <button className="link danger" onClick={() => rmSector(i)}>Remove</button>
          </div>
        ))}
        <button className="btn ghost-d" onClick={addSector}>+ Add sector</button>
      </section>

      <section><h2>Business products</h2>
        <p className="hint">No price = the product shows “Enquire on WhatsApp”. Add a price later and it becomes orderable in the quote. Empty fields are simply not shown. Minimum order is in the selling unit (e.g. 10 packs).</p>
        <datalist id="cats">{[...new Set(biz.products.map((p) => p.category).filter(Boolean))].map((c) => <option key={c} value={c} />)}</datalist>
        <div className="ptable">
          {biz.products.map((p, i) => (
            <div className="pcard" key={i}>
              <div className="bgrid">
                <label className="w2">Name<input id={`bname-${i}`} value={p.name} onChange={(e) => setBiz(i, 'name', e.target.value)} placeholder="e.g. Bin liner 40 × 50 in, yellow" /></label>
                <label>Type of bag<input list="cats" value={p.category} onChange={(e) => setBiz(i, 'category', e.target.value)} placeholder="e.g. Medical waste bags" /><small>Pick an existing type to group them in the site filter</small></label>
                <label>Size<input value={p.size} onChange={(e) => setBiz(i, 'size', e.target.value)} placeholder="40 × 50 in" /></label>
                <label>Gauge<input value={p.gauge} onChange={(e) => setBiz(i, 'gauge', e.target.value)} placeholder="e.g. 100" /></label>
                <label>Colour<input value={p.colour} onChange={(e) => setBiz(i, 'colour', e.target.value)} placeholder="e.g. Black" /></label>
                <label className="w4">Details<input value={p.details ?? ''} onChange={(e) => setBiz(i, 'details', e.target.value)} placeholder="Material, features, uses, e.g. LDPE · drawstring · clear" /></label>
                <label>Sold as<input value={p.unit} onChange={(e) => setBiz(i, 'unit', e.target.value)} placeholder="Pack of 50, Carton of 500" /></label>
                <label>Price per unit (KES)<input type="number" min="0" inputMode="decimal" value={p.price ?? ''} onChange={(e) => setBiz(i, 'price', e.target.value)} placeholder="On enquiry" /></label>
                <label>Minimum order<input type="number" min="1" step="1" inputMode="numeric" value={p.moq ?? ''} onChange={(e) => setBiz(i, 'moq', e.target.value)} placeholder="None" /></label>
              </div>
              <div className="brow-end">
                <label className="chk"><input type="checkbox" checked={p.active} onChange={(e) => setBiz(i, 'active', e.target.checked)} /> Shown on site</label>
                <button className="link danger" onClick={() => rmBiz(i)}>Remove product</button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn ghost-d" onClick={addBiz}>+ Add business product</button>
      </section>

      <section><h2>Custom printing</h2><div className="f2">
        <label className="chk wide"><input type="checkbox" checked={biz.printing.on} onChange={(e) => up('industries.printing.on', e.target.checked)} /> Offer custom printing on the business site</label>
        {F({ label: 'Printing description', path: 'industries.printing.text', wide: true })}
      </div></section>
      </>}

      <div className="savebar">
        {msg ? (
          <span className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</span>
        ) : deploy ? (
          <span className={`${DEPLOY[deploy.state].tone} pub`} role="status" aria-live="polite">
            {!DONE.includes(deploy.state) && <i className="spin" aria-hidden="true" />}
            {DEPLOY[deploy.state].text}{' '}
            {DEPLOY[deploy.state].site && <><a href="../" target="_blank" rel="noreferrer">View site ↗</a>{' '}</>}
            {deploy.url ? <a href={deploy.url} target="_blank" rel="noreferrer">Details ↗</a> : <a href={deploy.commitUrl} target="_blank" rel="noreferrer">View change ↗</a>}
          </span>
        ) : (
          <span className="note">Changes go live a few minutes after you save.</span>
        )}
        <button className="btn lime" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </main>
  )
}
