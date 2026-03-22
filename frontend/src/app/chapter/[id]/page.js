'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getChapterImages, getProxyImageUrl } from '../../../services/api'
import { saveHistory } from '../../../services/history'
import LazyMangaImage from '../../../components/LazyMangaImage'
import Link from 'next/link'
import { Home, ChevronLeft, ChevronRight, Info, List } from 'lucide-react'

export default function Reader() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)

  // 1. Fetch Data
  useEffect(() => {
    if (id) {
      setLoading(true)
      window.scrollTo(0, 0)
      
      getChapterImages(id).then(res => {
        setData(res)
        setLoading(false)
        if (res.manga && res.currentChapter) {
          saveHistory(res.manga, res.currentChapter)
        }
      }).catch(err => {
        console.error(err)
        setLoading(false)
      })
    }
  }, [id])

  // 2. Auto-hide controls
  useEffect(() => {
    let timer;
    const handleAction = () => {
      setControlsVisible(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setControlsVisible(false), 3000)
    }

    window.addEventListener('scroll', handleAction)
    window.addEventListener('mousemove', handleAction)
    return () => {
      window.removeEventListener('scroll', handleAction)
      window.removeEventListener('mousemove', handleAction)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
      <div className="w-12 h-12 border-4 border-slate-900 border-t-brand-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Đang tải chương...</p>
    </div>
  )

  if (!data) return null
  const { images, manga, currentChapter, allChapters } = data
  const currentIndex = allChapters.findIndex(c => c.id === parseInt(id))
  const prevChapter = allChapters[currentIndex - 1]
  const nextChapter = allChapters[currentIndex + 1]

  return (
    <div className="bg-slate-950 min-h-screen flex flex-col items-center relative overflow-x-hidden">
      
      {/* Floating Header Controls */}
      <div className={`fixed top-4 inset-x-0 z-[200] flex justify-center transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="glass-card px-4 py-2 rounded-full flex items-center gap-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors"><Home size={18}/></Link>
          <div className="w-px h-6 bg-white/10"></div>
          
          <div className="flex items-center gap-2">
            <Link href={prevChapter ? `/chapter/${prevChapter.id}` : '#'} className={`p-2 rounded-lg transition-all ${!prevChapter ? 'opacity-10 text-slate-600' : 'hover:bg-white/10 text-white'}`}><ChevronLeft size={20}/></Link>
            <div className="flex flex-col items-center px-2">
              <select 
                value={currentChapter.id} 
                onChange={(e) => router.push(`/chapter/${e.target.value}`)} 
                className="bg-transparent text-sm font-black text-white border-0 focus:ring-0 cursor-pointer p-0 text-center appearance-none"
              >
                {allChapters.map(c => <option key={c.id} value={c.id} className="bg-slate-900">CHƯƠNG {c.chapter_number}</option>)}
              </select>
              <span className="text-[9px] font-bold text-brand-500 uppercase tracking-tighter truncate max-w-[120px]">{manga.title}</span>
            </div>
            <Link href={nextChapter ? `/chapter/${nextChapter.id}` : '#'} className={`p-2 rounded-lg transition-all ${!nextChapter ? 'opacity-10 text-slate-600' : 'hover:bg-white/10 text-white'}`}><ChevronRight size={20}/></Link>
          </div>
          
          <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
          <Link href={`/manga/${manga.slug}`} className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block"><List size={18}/></Link>
        </div>
      </div>

      {/* Manga Images Container */}
      <main className="w-full max-w-4xl flex flex-col pt-0 pb-20">
        {images.map((img, index) => (
          <LazyMangaImage key={index} src={getProxyImageUrl(img.image_url)} alt={`Page ${img.page_number}`} />
        ))}

        {images.length === 0 && (
          <div className="py-40 text-center space-y-6">
            <Info size={48} className="mx-auto text-slate-800" />
            <p className="text-slate-500 font-bold tracking-widest italic uppercase text-xs">Nội dung đang được cập nhật...</p>
            <Link href={`/manga/${manga.slug}`} className="inline-block px-10 py-3 bg-brand-500 text-white font-black rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 uppercase text-xs">QUAY LẠI TRANG CHI TIẾT</Link>
          </div>
        )}

        {/* Bottom Navigation Navigation */}
        {images.length > 0 && (
          <div className="mt-20 px-4 py-20 flex flex-col items-center gap-10 border-t border-white/5">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-600 tracking-[.3em] uppercase mb-4 italic">BẠN ĐÃ ĐỌC XONG CHƯƠNG {currentChapter.chapter_number}</p>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">{manga.title}</h3>
            </div>
            
            <div className="flex gap-4 w-full">
              {prevChapter && (
                <Link href={`/chapter/${prevChapter.id}`} className="flex-1 py-4 glass-card rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white/5 hover:border-brand-500/30 transition-all group border-white/5 shadow-xl">
                  <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={18}/> CHƯƠNG TRƯỚC
                </Link>
              )}
              {nextChapter ? (
                <Link href={`/chapter/${nextChapter.id}`} className="flex-1 py-4 bg-brand-500 hover:bg-brand-600 shadow-2xl shadow-brand-500/30 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 group transition-all">
                  CHƯƠNG KẾ TIẾP <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18}/>
                </Link>
              ) : (
                <Link href={`/manga/${manga.slug}`} className="flex-1 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl text-xs flex items-center justify-center hover:bg-slate-800 transition-all border border-white/5 italic shadow-xl">
                   HẾT TRUYỆN
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
