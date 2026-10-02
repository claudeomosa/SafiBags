'use client'
import { useEffect, useState } from 'react'
import { validate } from '../../lib/config'
import { REPO, loadConfig, saveConfig } from '../../lib/github'

const KEY = 'sb_gh_token'
const blank = { id: '', name: '', litres: 60, size: '', weight: '', price: 0, active: true }
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

  const run = async (fn) => {
    setBusy(true); setMsg(null)
    try { await fn() } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }
  const open = (t) => run(async () => {
    try {
      const r = await loadConfig(t)
      setToken(t); setCfg(r.cfg); setSha(r.sha)
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
    setMsg({ ok: true, text: 'Saved. The live site updates in about 1–2 minutes.', link: r.commitUrl })
  })

  const up = (path, v) => setCfg((c) => {
    const n = structuredClone(c); let o = n; const k = path.split('.')
    k.slice(0, -1).forEach((p) => (o = o[p])); o[k.at(-1)] = v; return n
  })
  const setProduct = (i, k, v) => up(`products.${i}.${k}`, v)
  const addProduct = () => up('products', [...cfg.products, { ...blank, id: `size-${cfg.products.length + 1}` }])
  const rmProduct = (i) => up('products', cfg.products.filter((_, j) => j !== i))
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

      <section><h2>Business</h2><div className="f2">
        {F({ label: 'Main WhatsApp number (receives orders)', path: 'business.phone', hint: 'Country code, digits only, e.g. 254768014285' })}
        {F({ label: 'Secondary number (optional)', path: 'business.phone2', hint: 'Shown in the footer as an extra contact' })}
        {F({ label: 'Email (optional)', path: 'business.email' })}
        {F({ label: 'Location', path: 'business.location' })}
        {F({ label: 'Announcement bar (empty to hide)', path: 'announcement' })}
      </div></section>

      <section><h2>Hero</h2><div className="f2">
        {F({ label: 'Headline line 1', path: 'hero.line1' })}
        {F({ label: 'Headline line 2', path: 'hero.line2' })}
        {F({ label: 'Intro text', path: 'hero.lead', wide: true })}
      </div></section>

      <section><h2>Products and prices (KES per bag)</h2>
        <div className="ptable">
          {cfg.products.map((p, i) => (
            <div className="prow" key={i}>
              <label>Name<input value={p.name} onChange={(e) => setProduct(i, 'name', e.target.value)} /></label>
              <label>ID<input value={p.id} onChange={(e) => setProduct(i, 'id', e.target.value)} /></label>
              <label>Litres<input type="number" min="0" value={p.litres} onChange={(e) => setProduct(i, 'litres', e.target.value)} /></label>
              <label>Size<input value={p.size} onChange={(e) => setProduct(i, 'size', e.target.value)} /></label>
              <label>Weight<input value={p.weight} onChange={(e) => setProduct(i, 'weight', e.target.value)} /></label>
              <label>Price<input type="number" min="0" step="0.5" value={p.price} onChange={(e) => setProduct(i, 'price', e.target.value)} /></label>
              <label className="chk"><input type="checkbox" checked={p.active} onChange={(e) => setProduct(i, 'active', e.target.checked)} /> Shown</label>
              <button className="link danger" onClick={() => rmProduct(i)} disabled={cfg.products.length < 2}>Remove</button>
            </div>
          ))}
        </div>
        <button className="btn ghost-d" onClick={addProduct}>+ Add product</button>
      </section>

      <section><h2>Ordering and delivery</h2><div className="f2">
        {F({ label: 'Bags per step', path: 'orderStep', type: 'number', hint: 'The + and − buttons change quantity by this much' })}
        {F({ label: 'Minimum order (KES, 0 = none)', path: 'delivery.minOrderKes', type: 'number' })}
        {F({ label: 'Delivery areas', path: 'delivery.areas', wide: true })}
        {F({ label: 'Delivery note (e.g. delivery time)', path: 'delivery.note', wide: true })}
        {F({ label: 'Payment options (empty to hide)', path: 'payment', wide: true, hint: 'Shown as “Pay by …”, e.g. M-Pesa, cash on delivery' })}
        <label className="wide">Repeat options (one per line, first is the default one-off)
          <textarea rows="5" value={cfg.repeats.join('\n')} onChange={(e) => up('repeats', e.target.value.split('\n'))} />
        </label>
      </div></section>

      <div className="savebar">
        {msg && (
          <span className={msg.ok ? 'ok' : 'err'} role="alert">
            {msg.text} {msg.link && <a href={msg.link} target="_blank" rel="noreferrer">View change ↗</a>}
          </span>
        )}
        <button className="btn lime" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </main>
  )
}
