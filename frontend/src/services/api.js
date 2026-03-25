export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const getMangas = async (page = 1, q = '', genre = '') => {
  const url = new URL(`${API_URL}/mangas`);
  url.searchParams.append('page', page);
  if (q) url.searchParams.append('q', q);
  if (genre) url.searchParams.append('genre', genre);
  
  console.log(`[FRONTEND_FETCH] Calling API: ${url.toString()}`);
  
  const res = await fetch(url.toString());
  const json = await res.json();
  // Normalize: support both array (old cache) and {data, total} (new format)
  if (Array.isArray(json)) {
    return { data: json, total: json.length < 24 ? json.length : 9999 };
  }
  return { data: json.data || [], total: json.total || 0 };
};

export const getGenres = async () => {
  const res = await fetch(`${API_URL}/genres`);
  return res.json();
};

export const getMangaDetail = async (slug) => {
  const res = await fetch(`${API_URL}/mangas/${slug}`, {
    headers: getAuthHeaders()
  });
  return res.json();
};

export const getChapterImages = async (id) => {
  const res = await fetch(`${API_URL}/chapters/${id}`);
  return res.json();
};

export const getProxyImageUrl = (url) => {
  if (!url) return '';
  const cfProxy = process.env.NEXT_PUBLIC_IMAGE_PROXY_URL;
  if (cfProxy) {
    // Ensure URL is complete and encoded
    const fullUrl = url.startsWith('//') ? `https:${url}` : url;
    return `${cfProxy}${cfProxy.endsWith('/') ? '' : '/'}?url=${encodeURIComponent(fullUrl)}`;
  }
  return `${API_URL}/image?url=${encodeURIComponent(url)}`;
};

export const getSuggestions = async (q) => {
  if (!q || q.length < 2) return [];
  const res = await fetch(`${API_URL}/search/suggestions?q=${encodeURIComponent(q)}`);
  return res.json();
};

// Auth Services
export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
};

export const register = async (username, email, password) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
};

// User Services
const getAuthHeaders = () => {
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('manga_user') : null;
  if (!userStr) return {};
  const { token } = JSON.parse(userStr);
  return { 'Authorization': `Bearer ${token}` };
};

export const followManga = async (mangaId) => {
  const res = await fetch(`${API_URL}/user/follow/${mangaId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return res.json();
};

export const unfollowManga = async (mangaId) => {
  const res = await fetch(`${API_URL}/user/follow/${mangaId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.json();
};

export const getFollows = async () => {
  const res = await fetch(`${API_URL}/user/follows`, {
    headers: getAuthHeaders()
  });
  return res.json();
};

export const getNotifications = async () => {
  const res = await fetch(`${API_URL}/user/notifications`, {
    headers: getAuthHeaders()
  });
  return res.json();
};

export const markRead = async (id) => {
  const res = await fetch(`${API_URL}/user/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return res.json();
};
