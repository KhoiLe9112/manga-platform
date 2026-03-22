'use client'
import { BookOpen } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="glass-card border-t-white/5 py-12 mt-20 relative z-10 w-full">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left text-slate-400">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
            <BookOpen size={20} className="text-brand-500" />
            <span className="text-xl font-bold text-white tracking-tighter">MANGAVERSE</span>
          </div>
          <p className="text-sm leading-relaxed">
            Nền tảng đọc truyện tranh cao cấp với tốc độ load cực nhanh và trải nghiệm người dùng tuyệt vời. Dữ liệu được cập nhật tự động 24/7.
          </p>
        </div>
        <div className="flex flex-col gap-2 italic">
          <h4 className="font-bold text-white not-italic mb-2">Hỗ trợ</h4>
          <a href="#" className="hover:text-brand-400">Điều khoản sử dụng</a>
          <a href="#" className="hover:text-brand-400">Chính sách bảo mật</a>
          <a href="#" className="hover:text-brand-400">Liên hệ</a>
        </div>
        <div>
          <h4 className="font-bold text-white mb-4">Mạng xã hội</h4>
          <div className="flex justify-center md:justify-start gap-4">
            <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all cursor-pointer">FB</div>
            <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all cursor-pointer">TW</div>
            <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all cursor-pointer">DC</div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} MangaVerse. Developed by Elite AI. Powered by Next.js & Docker.
      </div>
    </footer>
  )
}
