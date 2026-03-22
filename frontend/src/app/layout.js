import './globals.css'
import { Inter } from 'next/font/google'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['vietnamese', 'latin'] })

export const metadata = {
  title: 'MangaVerse - Elite Reading Platform',
  description: 'Experience manga like never before with high speed and premium design.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="custom-scrollbar">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col`}>
        {/* Animated Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-900/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
        </div>

        <Suspense fallback={<div className="h-20 bg-slate-950"></div>}>
          <Header />
        </Suspense>

        <main className="flex-grow">{children}</main>

        <Footer />
      </body>
    </html>
  )
}
