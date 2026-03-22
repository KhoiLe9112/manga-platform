'use client'
import { useState, useEffect } from 'react'
import { getFollows, getProxyImageUrl } from '../../services/api'
import Link from 'next/link'
import { Heart, Clock, ChevronRight, BookOpen } from 'lucide-react'

export default function FollowsPage() {
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem('manga_user')
    if (!userStr) {
      window.location.href = '/'
      return
    }
    
    getFollows().then(data => {
      setMangas(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
          <Heart size={32} className="text-red-500" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Truyện đang theo dõi</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Sếp có {mangas.length} bộ truyện trong danh sách</p>
        </div>
      </div>

      {mangas.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {mangas.map((manga) => (
            <Link 
              key={manga.id} 
              href={`/manga/${manga.slug}`}
              className="group relative flex flex-col bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden hover:border-brand-500/50 transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <img 
                  src={getProxyImageUrl(manga.cover)} 
                  alt={manga.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                
                {manga.latest_chapter_number && (
                  <div className="absolute top-3 left-3 bg-brand-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                    Chương {manga.latest_chapter_number}
                  </div>
                )}
              </div>
              
              <div className="p-4 flex-grow flex flex-col justify-between">
                <h3 className="font-bold text-sm text-slate-100 line-clamp-2 min-h-[40px] group-hover:text-brand-400 transition-colors">
                  {manga.title}
                </h3>
                
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-brand-500" />
                    {manga.latest_chapter_at ? new Date(manga.latest_chapter_at).toLocaleDateString('vi-VN') : 'Mới'}
                  </div>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-20 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={40} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-300 mb-2">Chưa có truyện nào trong danh sách, sếp ơi!</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto tracking-tight">Hãy khám phá kho truyện khổng lồ và nhấn nút theo dõi để không bỏ lỡ các chương mới nhất nhé.</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-brand-500/20 uppercase tracking-widest text-sm"
          >
            Khám phá ngay
          </Link>
        </div>
      )}
    </div>
  )
}
