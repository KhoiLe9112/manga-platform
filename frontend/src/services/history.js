export const RECORD_LIMIT = 10;

export const saveHistory = (manga, chapter) => {
  if (typeof window === 'undefined') return;

  const history = JSON.parse(localStorage.getItem('manga_history') || '[]');
  
  // Find if manga exists
  const existingIndex = history.findIndex(item => item.slug === manga.slug);
  
  const newEntry = {
    id: manga.id,
    title: manga.title,
    slug: manga.slug,
    cover: manga.cover,
    lastChapterId: chapter.id,
    lastChapterNumber: chapter.chapter_number,
    timestamp: Date.now()
  };

  if (existingIndex > -1) {
    history.splice(existingIndex, 1);
  }
  
  const newHistory = [newEntry, ...history].slice(0, RECORD_LIMIT);
  localStorage.setItem('manga_history', JSON.stringify(newHistory));
};

export const getHistory = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('manga_history') || '[]');
};
