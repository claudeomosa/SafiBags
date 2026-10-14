'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { prettyPhone, waUrl } from '../lib/order'

// Brand mark from the identity board: tied bag + lime spark
export const Mark = ({ bag = 'currentColor', spark = '#B4E12B', size = 36 }) => (
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

export const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
  </svg>
)

export const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
  </svg>
)

// Follows the device setting until the visitor picks one; the choice is saved and
// applied before paint by the inline script in layout.js.
export function ThemeToggle() {
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
export const waFormat = (text) =>
  text.split(/(\*[^*\n]+\*|_[^_\n]+_)/).map((s, i) =>
    s.length > 2 && s[0] === '*' && s.at(-1) === '*' ? <b key={i}>{s.slice(1, -1)}</b>
      : s.length > 2 && s[0] === '_' && s.at(-1) === '_' ? <i key={i}>{s.slice(1, -1)}</i>
        : s)

// Shared header for both parts. The Homes | Business switch is always visible (also on
// mobile, where the section links collapse into the menu).
export function Header({ part, links, cta, announcement }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [menu])
  return (
    <>
      {announcement && <div className="announce">{announcement}</div>}
      <header className="nav" id="top">
        <div className="wrap nav-in">
          <Logo />
          <div className="switch" aria-label="Shop for">
            <Link href="/" aria-current={part === 'homes' ? 'page' : undefined}>Homes</Link>
            <Link href="/industries/" aria-current={part === 'business' ? 'page' : undefined}>Business</Link>
          </div>
          <nav className={menu ? 'open' : ''} aria-label="Main">
            {links.map(([h, t]) => <a key={h} href={h} onClick={() => setMenu(false)}>{t}</a>)}
            <a className="btn lime sm" href={cta[0]} onClick={() => setMenu(false)}>{cta[1]}</a>
          </nav>
          <div className="nav-end">
            <ThemeToggle />
            <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span /><span />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}

export function Footer({ business, blurb }) {
  const { phone, phone2, email, location, hours } = business
  return (
    <footer id="contact">
      <div className="wrap foot">
        <div>
          <Logo />
          <p>{blurb}</p>
          <p className="foot-switch"><Link href="/">For homes</Link> · <Link href="/industries/">For business</Link></p>
        </div>
        <div>
          <h4>Talk to us</h4>
          <a href={waUrl(phone, 'Hi Safi Bags, I have a question.')} target="_blank" rel="noreferrer">WhatsApp {prettyPhone(phone)}</a>
          <a href={`tel:+${phone}`}>Call {prettyPhone(phone)}</a>
          {phone2 && <a href={`tel:+${phone2}`}>Also {prettyPhone(phone2)}</a>}
          {email && <a href={`mailto:${email}`}>{email}</a>}
        </div>
        <div>
          <h4>Find us</h4>
          <p>{location}</p>
          {hours && <p>{hours}</p>}
        </div>
      </div>
      <p className="wrap copy">© {new Date().getFullYear()} Safi Bags</p>
    </footer>
  )
}
