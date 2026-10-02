'use client'
import { useEffect, useState } from 'react'

const api = (method, url, body) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(async (r) => {
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status })
    return j
  })

const blank = { id: '', name: '', litres: 60, size: '', weight: '', price: 0, active: true }

export default function Panel() {
  const [cfg, setCfg] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState(null) // { ok, text }
  const [busy, setBusy] = useState(false)

  const load = () => api('GET', '/api/admin/config').then((c) => { setCfg(c); setAuthed(true) }).catch(() => setAuthed(false))
  useEffect(() => { load() }, [])

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try { await fn(); okText && setMsg({ ok: true, text: okText }) } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }
  const login = (e) => { e.preventDefault(); run(async () => { await api('POST', '/api/admin/login', { password: pw }); setPw(''); await load() }) }
  const logout = () => run(async () => { await api('DELETE', '/api/admin/login'); setAuthed(false); setCfg(null) })
  const save = () => run(async () => setCfg(await api('PUT', '/api/admin/config', cfg)), 'Saved. The site now shows these values.')

  const up = (path, v) => setCfg((c) => {
    const n = structuredClone(c); let o = n; const k = path.split('.')
    k.slice(0, -1).forEach((p) => (o = o[p])); o[k.at(-1)] = v; return n
  })
  const setProduct = (i, k, v) => up(`products.${i}.${k}`, v)
  const addProduct = () => up('products', [...cfg.products, { ...blank, id: `size-${cfg.products.length + 1}` }])
  const rmProduct = (i) => up('products', cfg.products.filter((_, j) => j !== i))

  if (!authed) {
    return (
      <main className="adm">
        <form className="login" onSubmit={login}>
          <h1>Safi Bags admin</h1>
          <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" /></label>
          <button className="btn lime" disabled={busy || !pw}>Sign in</button>
          {msg && <p className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</p>}
        </form>
      </main>
    )
  }
  if (!cfg) return <main className="adm"><p>Loading…</p></main>

  const F = ({ label, path, type = 'text', wide, hint }) => (
    <label className={wide ? 'wide' : ''}>{label}
      <input type={type} value={path.split('.').reduce((o, k) => o[k], cfg)} onChange={(e) => up(path, type === 'number' ? e.target.value : e.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  )

  return (
    <main className="adm">
      <header className="adm-bar">
        <h1>Safi Bags admin</h1>
        <div><a href="/" target="_blank" rel="noreferrer">View site ↗</a> <button className="link" onClick={logout}>Sign out</button></div>
      </header>

      <section><h2>Business</h2><div className="f2">
        <F label="Main WhatsApp number (receives orders)" path="business.phone" hint="Country code, digits only, e.g. 254768014285" />
        <F label="Secondary number (optional)" path="business.phone2" hint="Shown in the footer as an extra contact" />
        <F label="Email (optional)" path="business.email" />
        <F label="Location" path="business.location" />
        <F label="Announcement bar (empty to hide)" path="announcement" />
      </div></section>

      <section><h2>Hero</h2><div className="f2">
        <F label="Headline line 1" path="hero.line1" />
        <F label="Headline line 2" path="hero.line2" />
        <F label="Intro text" path="hero.lead" wide />
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
        <F label="Bags per step" path="orderStep" type="number" hint="The + and − buttons change quantity by this much" />
        <F label="Minimum order (KES, 0 = none)" path="delivery.minOrderKes" type="number" />
        <F label="Delivery areas" path="delivery.areas" wide />
        <F label="Delivery note (e.g. delivery time)" path="delivery.note" wide />
        <F label="Payment options (empty to hide)" path="payment" wide hint="Shown as “Pay by …”, e.g. M-Pesa, cash on delivery" />
        <label className="wide">Repeat options (one per line, first is the default one-off)
          <textarea rows="5" value={cfg.repeats.join('\n')} onChange={(e) => up('repeats', e.target.value.split('\n'))} />
        </label>
      </div></section>

      <div className="savebar">
        {msg && <span className={msg.ok ? 'ok' : 'err'} role="alert">{msg.text}</span>}
        <button className="btn lime" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </main>
  )
}
