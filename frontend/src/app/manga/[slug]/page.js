'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMangaDetail, getProxyImageUrl, followManga, unfollowManga } from '../../../services/api'
import Link from 'next/link'
import { ChevronRight, Star, User, Activity, Tag, ListOrdered, Share2, Heart, HeartOff, Loader2 } from 'lucide-react'

export default function MangaDetail() {
  const router = useRouter()
  const { slug } = useParams()
  const [manga, setManga] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [isFollowed, setIsFollowed] = useState(false)

  useEffect(() => {
    if (slug) {
      refreshManga()
    }
  }, [slug])

  const refreshManga = async () => {
    try {
      const data = await getMangaDetail(slug)
      setManga(data)
      setIsFollowed(data.isFollowed)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    const userStr = localStorage.getItem('manga_user')
    if (!userStr) {
      // Prompt login or just alert
      alert('Vui lòng đăng nhập để theo dõi truyện sếp ơi!')
      return
    }

    setFollowLoading(true)
    try {
      if (isFollowed) {
        await unfollowManga(manga.id)
        setIsFollowed(false)
      } else {
        await followManga(manga.id)
        setIsFollowed(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
    </div>
  )

  if (!manga) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-bold text-slate-500 italic">404 - Truyện này đã bị đưa vào hư vô...</h2>
      <Link href="/" className="mt-8 text-brand-500 hover:underline inline-block">Quay lại trang chủ</Link>
    </div>
  )

  const genres = Array.isArray(manga.genres) 
    ? manga.genres 
    : (typeof manga.genres === 'string' ? manga.genres.split(',').map(g => g.trim()) : []);

  return (
    <div className="relative">
      {/* Dynamic Background Backdrop */}
      <div className="absolute top-0 inset-x-0 h-[60vh] overflow-hidden -z-20">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl z-10"></div>
        <img src={getProxyImageUrl(manga.cover)} className="w-full h-full object-cover scale-150 blur-3xl opacity-30" alt="Backdrop" referrerPolicy="no-referrer" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-12">
          <Link href="/" className="hover:text-white transition-colors">TRANG CHỦ</Link>
          <ChevronRight size={14} />
          <span className="text-white">TRUYỆN TRANH</span>
          <ChevronRight size={14} />
          <span className="text-brand-400 line-clamp-1">{manga.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:items-start">
          {/* Cover & Quick Actions */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <div className="relative group rounded-2xl overflow-hidden shadow-2xl shadow-black border border-white/5 bg-slate-900 aspect-[3/4.5]">
              <img 
                src={getProxyImageUrl(manga.cover)} 
                alt={manga.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg"><Star size={16} fill="white" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
                  isFollowed 
                  ? 'bg-slate-800 text-red-500 border border-red-500/30' 
                  : 'bg-brand-500 text-white shadow-brand-500/20 hover:bg-brand-600'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {isFollowed ? <><HeartOff size={18} /> BỎ DÕI</> : <><Heart size={18} /> THEO DÕI</>}
                  </>
                )}
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-white/5 active:scale-95">
                <Share2 size={18} /> CHIA SẺ
              </button>
            </div>
          </div>

          {/* Info & Content */}
          <div className="flex-grow space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-md">
                {manga.title}
              </h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-sm">
                  <User size={16} className="text-brand-400" />
                  <span className="font-semibold">{manga.author || 'Đang cập nhật'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 text-sm">
                  <Activity size={16} className="text-brand-400" />
                  <span className="font-semibold">{manga.status}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {genres.map((genre, i) => (
                  <span key={i} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-brand-500 hover:border-brand-500 transition-all cursor-pointer">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Tag size={20} className="text-brand-500" /> NỘI DUNG TÓM TẮT
              </div>
              <div className="relative glass-card rounded-2xl p-6 leading-relaxed text-slate-300 shadow-inner">
                <p>{manga.description || 'Truyện hiện chưa có phần giới thiệu chi tiết. Đội ngũ đang cập nhật nội dung này sớm nhất cho độc giả.'}</p>
                <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-brand-500/10 blur-[40px] rounded-full"></div>
              </div>
            </div>

            {/* Chapter List */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xl font-black italic">
                  <ListOrdered size={24} className="text-brand-500" /> DANH SÁCH <span className="text-brand-400">CHƯƠNG</span>
                </div>
                <span className="text-xs font-bold text-slate-500">{manga.chapters?.length || 0} CHƯƠNG ĐÃ RA MẮT</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {manga.chapters?.map((chapter, idx) => (
                  <Link 
                    key={chapter.id}
                    href={`/chapter/${chapter.id}`}
                    className="group flex items-center justify-between p-4 glass-card rounded-xl border-white/5 hover:border-brand-500/50 hover:bg-slate-800 transition-all transform hover:-translate-x-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-lg text-xs font-black text-slate-500 group-hover:text-brand-400 transition-colors">
                        #{manga.chapters.length - idx}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-200 group-hover:text-white">Chương {chapter.chapter_number}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          {new Date(chapter.created_at).toLocaleDateString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
