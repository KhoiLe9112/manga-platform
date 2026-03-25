"use client";
import React, { useEffect, useState } from 'react';
import { getChapterImages, getProxyImageUrl } from '@/services/api';

export default function Reader({ chapterId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChapterImages(chapterId).then(data => {
      setImages(data);
      setLoading(false);
    });
  }, [chapterId]);

  if (loading) return <div className="animate-pulse space-y-4">
    {[1,2,3].map(i => <div key={i} className="bg-gray-700 h-96 w-full rounded" />)}
  </div>;

  return (
    <div className="flex flex-col items-center bg-black min-h-screen pt-4">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={getProxyImageUrl(img.image_url)}
          alt={`Page ${img.page_number}`}
          loading="lazy"
          className="max-w-4xl w-full mb-2 shadow-2xl"
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
}
