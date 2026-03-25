'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getMangas, getProxyImageUrl, getGenres } from '../services/api'
import { getHistory } from '../services/history'
import Link from 'next/link'
import { Flame, Clock, Navigation, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Hash, History, Zap } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL Persistent States
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page')) || 1
  const selectedGenre = searchParams.get('genre') || ''

  const [data, setData] = useState({ data: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [genres, setGenres] = useState([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    setMounted(true)
    getGenres().then(setGenres).catch(console.error)
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    setLoading(true)
    getMangas(page, query, selectedGenre).then(res => {
      setData(res)
      setLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [page, query, selectedGenre])

  const totalPages = Math.ceil(data.total / 24)

  const updateUrl = (newParams) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === null || newParams[key] === '') {
        params.delete(key)
      } else {
        params.set(key, newParams[key].toString())
      }
    })
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage })
    }
  }

  const handleGenreChange = (genre) => {
    const nextGenre = selectedGenre === genre ? '' : genre
    updateUrl({ genre: nextGenre, page: 1 }) // Reset page to 1 on genre change
  }

  const getPagination = () => {
    let pages = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    const adjustedStart = Math.max(1, end - 4)

    for (let i = adjustedStart; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  if (!mounted) return null

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Đang nạp kho truyện cực lớn...</p>
    </div>
  )

  const mangas = data.data

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      
      {/* Recently Read Section */}
      {!query && !selectedGenre && history.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-100 font-black uppercase tracking-tight text-xl">
              <History size={24} className="text-brand-500" />
              Vừa đọc gần đây
            </div>
            <button 
              onClick={() => { localStorage.removeItem('manga_history'); setHistory([]); }}
              className="text-[10px] font-black text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Xóa lịch sử
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-6 pt-2 px-2 -mx-2 snap-x snap-mandatory custom-scrollbar">
            {history.map((item) => (
              <Link 
                key={item.slug} 
                href={`/chapter/${item.lastChapterId}`}
                className="glass-card flex-shrink-0 w-[240px] sm:w-[280px] snap-start p-3 rounded-2xl border-white/5 hover:border-brand-500/30 transition-all flex items-center gap-3 group relative"
              >
                {/* Tooltip for History Title - Adjusted for visibility */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-md border border-white/10 p-2 rounded-xl text-[10px] font-bold text-white text-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] translate-y-2 group-hover:translate-y-0">
                  {item.title}
                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95"></div>
                </div>
                
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 relative">
                  <img src={getProxyImageUrl(item.cover)} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-xs font-bold text-slate-100 truncate mb-1">{item.title}</div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-black text-brand-500 uppercase tracking-tighter">
                      Chương {item.lastChapterNumber}
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap size={10} className="text-brand-500" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* Hero Section */}
      {!query && page === 1 && !selectedGenre && (
        <section className="relative rounded-3xl overflow-hidden aspect-[21/9] md:aspect-[3/1] group shadow-2xl shadow-brand-500/10 border border-white/5 bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10"></div>
          {mangas[0] && (
            <img 
              src={getProxyImageUrl(mangas[0].cover)} 
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] group-hover:scale-105 transition-transform duration-[2s]"
              alt="Hero"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="relative z-20 h-full flex flex-col justify-center px-8 md:px-16 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-widest">
              <Flame size={14} /> Tiêu điểm hôm nay
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg leading-none">
              {mangas[0]?.title || 'Chào mừng tới MangaVerse'}
            </h1>
            <p className="text-slate-300 text-sm md:text-lg line-clamp-2 max-w-lg">
              Khám phá thế giới truyện tranh đỉnh cao với chất lượng hình ảnh tốt nhất và trải nghiệm mượt mà không quảng cáo.
            </p>
            <div className="flex gap-4 pt-4">
              <Link 
                href={mangas[0] ? `/manga/${mangas[0].slug}` : '#'} 
                className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-bold shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1"
              >
                Đọc ngay
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Genre Filter */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs">
          <Hash size={14} className="text-brand-500" />
          Phân loại theo thể loại
        </div>
        <div className="flex flex-wrap gap-2 text-center">
          <button
            onClick={() => updateUrl({ genre: '', page: 1 })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedGenre === '' 
              ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
              : 'glass-card border-white/5 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            TẤT CẢ
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => handleGenreChange(genre)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase ${
                selectedGenre === genre 
                ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
                : 'glass-card border-white/5 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-brand-500 rounded-full"></div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 italic uppercase">
              {query ? `Kết quả cho: ${query}` : selectedGenre ? `THỂ LOẠI: ${selectedGenre}` : `TRUYỆN MỚI CẬP NHẬT`}
            </h2>
          </div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            {data.total} truyện trong kho
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 min-h-[400px]">
          {mangas.map((manga, idx) => (
            <Link 
              key={manga.id} 
              href={`/manga/${manga.slug}`}
              className="group flex flex-col gap-3 animate-fade-in relative"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Tooltip for Title */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-md border border-white/10 p-2 rounded-xl text-[11px] font-bold text-white text-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                {manga.title}
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95"></div>
              </div>

              <div className="relative aspect-[3/4.5] rounded-2xl overflow-hidden shadow-xl shadow-black/50 border border-white/5 transition-all duration-300 group-hover:border-brand-500/50 group-hover:-translate-y-2">
                <img 
                  src={getProxyImageUrl(manga.cover)} 
                  alt={manga.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black rounded-lg text-center">
                    XEM CHI TIẾT
                  </div>
                </div>
              </div>
              <div className="space-y-2 px-1 relative">
                <h3 className="font-bold text-[13px] line-clamp-2 leading-snug group-hover:text-brand-400 transition-colors duration-300 uppercase tracking-tight h-[40px] overflow-hidden">
                  {manga.title}
                </h3>
                <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider pt-1 border-t border-white/5">
                  {manga.latest_chapter_number ? (
                    <div className="flex items-center gap-1.5 text-yellow-500">
                      <Zap size={10} className="fill-yellow-500" />
                      <span>Chương {manga.latest_chapter_number}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock size={10}/> 
                      <span>{manga.status}</span>
                    </div>
                  )}
                  {manga.latest_chapter_at && (
                    <div className="text-slate-600 text-[9px] font-medium tracking-tighter">
                      Cập nhật: {new Date(manga.latest_chapter_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-16">
            {/* First Page */}
            <button 
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="p-3 glass-card rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all text-slate-400 hover:text-white group relative"
            >
              <ChevronsLeft size={20} />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Trang đầu
              </div>
            </button>

            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-3 glass-card rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all text-slate-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-2">
              {getPagination().map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`min-w-[45px] h-[45px] flex items-center justify-center rounded-xl font-black text-sm transition-all ${
                    page === p 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                    : 'glass-card hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-3 glass-card rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all text-slate-400 hover:text-white"
            >
              <ChevronRight size={20} />
            </button>

            {/* Last Page */}
            <button 
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              className="p-3 glass-card rounded-xl disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all text-slate-400 hover:text-white group relative"
            >
              <ChevronsRight size={20} />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Trang cuối ({totalPages})
              </div>
            </button>
          </div>
        )}

        {mangas.length === 0 && (
          <div className="glass-card rounded-3xl py-24 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center animate-bounce">
              <BookOpen size={40} className="text-slate-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white uppercase">Không tìm thấy truyện nào!</h3>
              <p className="text-slate-400 max-w-sm">
                Thử tìm với từ khóa khác hoặc quay lại trang chủ.
              </p>
            </div>
            <Link href="/" className="px-8 py-3 bg-brand-500 text-white font-bold rounded-full transition-all">
              VỀ TRANG CHỦ
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
