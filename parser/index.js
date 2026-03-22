const cheerio = require('cheerio');

const BASE_URL = 'https://nettruyenviet1.com';

const normalizeUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const parseMangaList = (html) => {
  const $ = cheerio.load(html);
  const mangas = [];
  $('.item').each((i, el) => {
    const title = $(el).find('h3 a').text().trim();
    const sourceUrl = normalizeUrl($(el).find('h3 a').attr('href'));
    const cover = normalizeUrl($(el).find('img').attr('data-original') || $(el).find('img').attr('src'));
    if (title && sourceUrl) {
      mangas.push({ title, sourceUrl, cover });
    }
  });
  return mangas;
};

const parseMangaDetail = (html) => {
  const $ = cheerio.load(html);
  const title = $('.title-detail').text().trim();
  const author = $('.author p.col-xs-8').text().trim();
  const description = $('.detail-content p').text().trim();
  const status = $('.status p.col-xs-8').text().trim();
  const genres = [];
  $('.kind p.col-xs-8 a').each((i, el) => {
    genres.push($(el).text().trim());
  });

  const comicId = $('#hdId').val() || $('#hdComicId').val() || '';

  const chapters = [];
  
  // Try to find chapter list in common containers first
  const containers = ['#nt_listchapter', '.list-chapter', '.chapter-list', '#list-chapter'];
  let listFound = false;
  
  for (const selector of containers) {
    const container = $(selector);
    if (container.length) {
      container.find('li:not(.heading), div.row').each((i, el) => {
        const link = $(el).find('a').first();
        const chapterTitle = link.text().trim();
        const sourceUrl = normalizeUrl(link.attr('href'));
        
        if (sourceUrl && (chapterTitle.toLowerCase().includes('chapter') || chapterTitle.toLowerCase().includes('chương'))) {
          const chapterMatch = chapterTitle.match(/Chapter\s+([\d.]+)/i) || chapterTitle.match(/Chương\s+([\d.]+)/i);
          const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;
          chapters.push({ chapterTitle, sourceUrl, chapterNumber });
          listFound = true;
        }
      });
      if (listFound) break;
    }
  }

  // If still empty, scan all links in the document
  if (chapters.length === 0) {
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (text.toLowerCase().includes('chapter') || text.toLowerCase().includes('chương'))) {
        const chapterMatch = text.match(/Chapter\s+([\d.]+)/i) || text.match(/Chương\s+([\d.]+)/i);
        const chapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;
        
        // Basic deduplication
        if (!chapters.some(c => c.sourceUrl === normalizeUrl(href))) {
          chapters.push({ 
            chapterTitle: text, 
            sourceUrl: normalizeUrl(href), 
            chapterNumber 
          });
        }
      }
    });
  }

  return { title, author, description, status, genres, chapters, comicId };
};

const parseChapterImages = (html) => {
  const $ = cheerio.load(html);
  const images = [];
  
  // Try multiple common selectors for NetTruyen clones
  const selectors = [
    '.reading-detail .page-chapter img',
    '.reading-detail img',
    '.box_doc img',
    '.page-chapter img'
  ];

  let foundImages = false;
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((i, el) => {
        const imageUrl = normalizeUrl(
          $(el).attr('data-original') || 
          $(el).attr('data-src') || 
          $(el).attr('data-cdn') || 
          $(el).attr('src')
        );
        
        // Filter out common UI icons or ads
        if (imageUrl && !imageUrl.includes('logo') && !imageUrl.includes('banner') && !imageUrl.includes('icon')) {
          images.push({
            imageUrl: imageUrl,
            pageNumber: images.length + 1
          });
        }
      });
      if (images.length > 0) {
        foundImages = true;
        break;
      }
    }
  }

  return images;
};

module.exports = {
  parseMangaList,
  parseMangaDetail,
  parseChapterImages,
  normalizeUrl,
};
