import { Sora, DM_Sans } from 'next/font/google'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--sora' })
const dm = DM_Sans({ subsets: ['latin'], variable: '--dm' })

export const metadata = {
  title: 'Safi Bags | Bin liners for homes and businesses across Kenya',
  description: 'Find your bin. Pick your bag. Order or schedule bin liner deliveries on WhatsApp.',
}

// mobile browser chrome matches the night nav in both colour schemes
export const viewport = { themeColor: '#14213d', colorScheme: 'light dark' }

// Applies a saved theme choice before first paint so there's no flash of the wrong theme
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme before React hydrates
    <html lang="en" className={`${sora.variable} ${dm.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
