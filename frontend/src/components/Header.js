'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Menu, Home, Sparkles, BookOpen, Clock, Bell, User as UserIcon, LogOut, Heart, X as ClearIcon } from 'lucide-react'
import Link from 'next/link'
import { getSuggestions, getProxyImageUrl, getNotifications, markRead } from '../services/api'
import { AuthModal } from './AuthModal'

export default function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  
  const searchRef = useRef(null)
  const notificationRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const userStr = localStorage.getItem('manga_user')
    if (userStr) {
      const data = JSON.parse(userStr)
      setUser(data.user)
      fetchNotifications()
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      if (data && data.error === 'Phiên đăng nhập hết hạn.') {
        localStorage.removeItem('manga_user')
        setUser(null)
        setNotifications([])
        return
      }
      if (!data.error) setNotifications(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Poll for notifications every 5 minutes
  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  // Debounced search logic (already existing)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true)
        const results = await getSuggestions(query.trim())
        setSuggestions(results)
        setLoading(false)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSuggestions(false)
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false)
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setShowSuggestions(false)
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/')
    }
  }

  const navigateToManga = (slug) => {
    setShowSuggestions(false)
    setQuery('')
    router.push(`/manga/${slug}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('manga_user')
    setUser(null)
    setNotifications([])
    setShowUserMenu(false)
    router.push('/')
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markRead(notif.id)
      fetchNotifications()
    }
    setShowNotifications(false)
    router.push(`/chapter/${notif.chapter_id}`)
  }

  return (
    <>
    <header className="sticky top-0 z-[100] glass-card border-b-white/5 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20 group-hover:rotate-12 transition-transform duration-300">
              <BookOpen size={24} className="text-white" />
            </div>
            <div className="text-2xl font-black tracking-tighter premium-gradient-text">
              MANGA<span className="text-white">VERSE</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm font-bold uppercase tracking-tight text-slate-400">
            <Link href="/" className="hover:text-brand-400 transition-colors flex items-center gap-2">
              <Home size={18} /> Trang chủ
            </Link>
            {user && (
              <Link href="/follows" className="hover:text-brand-400 transition-colors flex items-center gap-2">
                <Heart size={18} className="text-red-500" /> Theo dõi
              </Link>
            )}
            <a href="#" className="hover:text-brand-400 transition-colors flex items-center gap-2">
              <Sparkles size={18} /> Phổ biến
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${loading ? 'text-brand-500' : 'text-slate-500'}`} size={16} />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                  placeholder="Tìm truyện..." 
                  className="bg-slate-800/50 border border-white/5 rounded-full py-2 pl-10 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 md:w-64 w-48 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setShowSuggestions(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <ClearIcon size={14} />
                  </button>
                )}
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div style={{ backgroundColor: '#0f172a', zIndex: 9999, opacity: 1 }} className="absolute top-full mt-2 left-0 right-0 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
                  <div className="py-2">
                    {suggestions.map((manga) => (
                      <button
                        key={manga.slug}
                        onClick={() => navigateToManga(manga.slug)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left group"
                      >
                        <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                          <img 
                            src={getProxyImageUrl(manga.cover)} 
                            alt={manga.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="text-sm font-bold text-slate-100 truncate group-hover:text-brand-400 transition-colors">
                            {manga.title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            {user && (
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-400 hover:text-white transition-colors relative"
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{ backgroundColor: '#0f172a', zIndex: 9999, opacity: 1 }} className="absolute top-full mt-2 right-0 w-80 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                      <span className="text-xs font-black uppercase text-slate-200">Thông báo mới</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <button 
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full p-4 text-left hover:bg-white/10 transition-colors border-b border-white/5 flex gap-3 items-start ${!n.is_read ? 'bg-brand-500/10' : ''}`}
                          >
                            <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></div>
                            <div className="flex-grow">
                              <p className="text-sm text-slate-100 group-hover:text-white">
                                <span className="font-bold text-brand-400">{n.manga_title}</span> vừa có <span className="font-bold text-white">Chương {n.chapter_number}</span> mới sếp ơi!
                              </p>
                              <span className="text-[11px] text-slate-400 mt-2 block font-medium">
                                {new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(n.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-10 text-center text-slate-200 text-sm font-bold bg-slate-900/50 italic opacity-80">
                          Chưa có thông báo nào sếp ạ!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 bg-slate-800/50 rounded-full border border-white/5 hover:border-brand-500/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-black text-white text-xs">
                    {user.username[0].toUpperCase()}
                  </div>
                </button>
              ) : (
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-500/20"
                >
                  Đăng nhập
                </button>
              )}

              {showUserMenu && (
                <div style={{ backgroundColor: '#0f172a', zIndex: 9999, opacity: 1 }} className="absolute top-full mt-2 right-0 w-56 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b border-white/5">
                    <p className="text-base font-black text-white truncate">{user.username}</p>
                    <p className="text-xs mt-1 text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="p-3">
                    <Link href="/follows" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-slate-200 transition-colors">
                      <Heart size={18} className="text-red-500" /> Truyện đang theo dõi
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-sm font-semibold text-red-500 transition-colors"
                    >
                      <LogOut size={18} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    <AuthModal 
      isOpen={isAuthOpen} 
      onClose={() => setIsAuthOpen(false)} 
      onUserChange={(userData) => {
        setUser(userData)
        fetchNotifications()
      }}
    />
    </>
  )
}
