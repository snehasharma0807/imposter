import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Imposter App',
  description: 'Word collections app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <Providers>
          <div className="flex-1">{children}</div>
        </Providers>
        <footer className="text-center py-4 text-slate-500 text-sm">
          made by{' '}
          <a
            href="https://www.linkedin.com/in/snehasharma77/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            sneha sharma
          </a>
        </footer>
      </body>
    </html>
  )
}