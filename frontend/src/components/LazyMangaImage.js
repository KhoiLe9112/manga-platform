'use client'
import { useState, useEffect, useRef } from 'react'

export default function LazyMangaImage({ src, alt, className }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '600px' }) // Load even earlier to avoid jumps

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div 
      ref={imgRef}
      className={`relative w-full bg-slate-950 flex flex-col items-center ${className}`}
    >
      {!isLoaded && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {isVisible && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-auto block transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
      )}
      
      {!isVisible && <div className="min-h-[400px] w-full bg-slate-950" />}
    </div>
  )
}
