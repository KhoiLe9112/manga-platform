const { Worker } = require('bullmq');
const axios = require('axios');
const db = require('../shared/db');
const logger = require('../shared/logger');
const parser = require('../parser');
const { redisConnection, QUEUE_NAME, mangaQueue } = require('../shared/queue');
const sharp = require('sharp');

const FULL_CRAWL_SLUGS = ['dau-cham-het-cho-tinh-don-phuong', 'giao-duc-chan-chinh'];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const worker = new Worker(QUEUE_NAME, async (job) => {
  const { url } = job.data;
  
  // Anti-ban: Random delay
  await sleep(2000 + Math.random() * 3000);

  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': getRandomUA(),
        'Referer': url.includes('tim-truyen') ? 'https://nettruyenviet1.com/' : 'https://nettruyenviet1.com/tim-truyen',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000,
    });

    if (job.name === 'discover-manga') {
      const mangas = parser.parseMangaList(response.data);
      for (const manga of mangas) {
        await mangaQueue.add('crawl-manga-detail', { url: manga.sourceUrl, cover: manga.cover });
      }
      logger.info(`Discovered ${mangas.length} mangas from ${url}`);
    }

    if (job.name === 'crawl-manga-detail') {
      let detail = parser.parseMangaDetail(response.data);
      const slug = url.split('/').pop().replace('.html', '');
      
      // If we have a comicId and not enough chapters, try to fetch the full list via AJAX
      if (detail.chapters.length < 100) {
        try {
          let ajaxUrl = detail.comicId 
            ? `https://nettruyenviet1.com/Comic/Services/ComicService.asmx/GetListChapter?comicId=${detail.comicId}`
            : `https://nettruyenviet1.com/Comic/Services/ComicService.asmx/ChapterList?slug=${slug}`;

          const ajaxResponse = await axios.get(ajaxUrl, {
            headers: { 
              'User-Agent': getRandomUA(),
              'Referer': url,
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
              'Connection': 'keep-alive'
            },
            timeout: 30000
          });
          
          let html = ajaxResponse.data;
          let fullChapters = [];

          if (html && html.data && Array.isArray(html.data)) {
            fullChapters = html.data.map(c => ({
              chapterTitle: c.chapter_name,
              sourceUrl: parser.normalizeUrl(`/truyen-tranh/${slug}/${c.chapter_slug}`),
              chapterNumber: parseFloat(c.chapter_num) || 0
            }));
          } 
          else {
            if (html && html.d) html = html.d;
            if (typeof html === 'string' && html.includes('<string')) {
              html = html.replace(/<string[^>]*>/, '').replace('</string>', '');
            }
            fullChapters = parser.parseMangaDetail(html).chapters;
          }

          if (fullChapters.length > detail.chapters.length) {
            logger.info(`Fetched ${fullChapters.length} chapters via AJAX for ${slug}`);
            detail.chapters = fullChapters;
          }
        } catch (ajaxErr) {
          logger.warn(`Failed to fetch full chapter list for ${url}`, { error: ajaxErr.message });
        }
      }

      // Upload Cover to Telegram (bypass 403 for thumbnails)
      let telegramCoverId = null;
      if (process.env.TELEGRAM_BOT_TOKEN && detail.cover) {
        try {
          const coverRes = await axios.get(detail.cover, { 
            responseType: 'arraybuffer', 
            headers: { 'Referer': 'https://nettruyenviet1.com/' },
            timeout: 30000 
          });
          const formData = new (require('form-data'))();
          formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
          formData.append('photo', Buffer.from(coverRes.data), { 
            filename: `cover_${slug}.jpg`, 
            contentType: 'image/jpeg' 
          });
          formData.append('caption', `COVER: ${detail.title} | Slug: ${slug}`);
          formData.append('disable_notification', 'true');

          const tgRes = await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, 
            formData, 
            { headers: formData.getHeaders(), timeout: 60000 }
          );
          telegramCoverId = tgRes.data?.result?.photo?.slice(-1)[0]?.file_id;
          if (telegramCoverId) logger.info(`Uploaded cover for ${detail.title} to TG`);
        } catch (coverErr) {
          logger.warn(`Failed to upload cover for ${detail.title} to TG: ${coverErr.message}`);
        }
      }

      const res = await db.query(
        `INSERT INTO mangas (title, slug, author, description, cover, status, genres, source_url, telegram_cover_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET 
           title = EXCLUDED.title, 
           updated_at = NOW(), 
           telegram_cover_id = COALESCE(EXCLUDED.telegram_cover_id, mangas.telegram_cover_id)
         RETURNING id`,
        [detail.title, slug, detail.author, detail.description, job.data.cover, detail.status, detail.genres, url, telegramCoverId]
      );
      
      const mangaId = res.rows[0].id;
      let chaptersToCrawl = detail.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
      if (!FULL_CRAWL_SLUGS.includes(slug)) {
        chaptersToCrawl = chaptersToCrawl.slice(0, 100);
      }

      for (const chapter of chaptersToCrawl) {
        await mangaQueue.add('crawl-chapter-images', { 
          mangaId, 
          url: chapter.sourceUrl, 
          chapterNumber: chapter.chapterNumber,
          title: chapter.chapterTitle
        });
      }
      logger.info(`Parsed detail for ${detail.title} with ${chaptersToCrawl.length} chapters`);
    }

    if (job.name === 'crawl-chapter-images') {
      const { mangaId, chapterNumber, title } = job.data;
      
      const res = await db.query(
        `INSERT INTO chapters (manga_id, chapter_number, title, source_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (manga_id, chapter_number) DO UPDATE SET title = EXCLUDED.title
         RETURNING id`,
        [mangaId, chapterNumber, title, url]
      );
      
      const chapterId = res.rows[0].id;
      
      const checkRes = await db.query('SELECT COUNT(*) FROM chapter_images WHERE chapter_id = $1 AND telegram_file_id IS NOT NULL', [chapterId]);
      if (parseInt(checkRes.rows[0].count) > 0) {
        logger.info(`Chapter ${chapterNumber} of manga ID ${mangaId} already crawled. Skipping.`);
        return;
      }

      const images = parser.parseChapterImages(response.data);

      if (images.length === 0) {
        if (response.data.includes('cloudflare') || response.data.includes('Turnstile') || response.data.includes('captcha')) {
          logger.warn(`Cloudflare block detected for ${url}`);
          throw new Error('Cloudflare Blocked');
        }
      }

      let currentPage = 1;
      for (const img of images) {
        try {
          // 1. Download image with robust retries
          let imgData = null;
          const maxRetries = 4; // 1 initial + 4 retries = 5 attempts
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              logger.info(`Downloading image (Attempt ${attempt + 1}/${maxRetries + 1}): ${img.imageUrl}`);
              imgData = await axios.get(img.imageUrl, {
                responseType: 'arraybuffer',
                headers: { 'Referer': 'https://nettruyenviet1.com/' },
                timeout: 45000 // 45s timeout
              });
              break; // Success, break out of retry loop
            } catch (dlErr) {
              if (attempt === maxRetries) {
                logger.error(`Completely failed to download image after ${maxRetries + 1} attempts: ${img.imageUrl}`);
                throw new Error(`Download failed: ${dlErr.message}`);
              }
              const delay = 15000; // Wait 15s before retry
              logger.warn(`Download error for ${img.imageUrl}, retrying in ${delay / 1000}s...`, { error: dlErr.message });
              await sleep(delay);
            }
          }

          // Telegram limit: height/width < 20 AND height < 10000.
          // We use tighter limits for maximum compatibility and preview quality.
          const MAX_SLICE_HEIGHT = 5000; 
          const metadata = await sharp(imgData.data).metadata();
          const slices = [];
          
          if (metadata.height > MAX_SLICE_HEIGHT) {
            let offset = 0;
            while (offset < metadata.height) {
              const currentSliceHeight = Math.min(MAX_SLICE_HEIGHT, metadata.height - offset);
              const sliceBuffer = await sharp(imgData.data)
                .extract({ left: 0, top: offset, width: metadata.width, height: currentSliceHeight })
                .jpeg({ quality: 80 })
                .toBuffer();
              slices.push(sliceBuffer);
              offset += currentSliceHeight;
            }
            logger.info(`Split long image (${metadata.width}x${metadata.height}) into ${slices.length} slices (max ${MAX_SLICE_HEIGHT}px each): ${img.imageUrl}`);
          } else {
            const buffer = await sharp(imgData.data)
              .jpeg({ quality: 80 })
              .toBuffer();
            slices.push(buffer);
          }

          // 3. Upload each slice and save to DB
          for (let i = 0; i < slices.length; i++) {
            const buffer = slices[i];
            const pageSuffix = slices.length > 1 ? `.${i+1}` : '';
            
            let fileId = null;
            if (process.env.TELEGRAM_BOT_TOKEN) {
              try {
                const formData = new (require('form-data'))();
                formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
                // Send as photo with proper filename and content type
                formData.append('photo', buffer, { 
                  filename: `p${img.pageNumber}${pageSuffix}.jpg`,
                  contentType: 'image/jpeg' 
                });
                formData.append('caption', `Manga ID: ${mangaId} | Chap: ${chapterNumber} | Page: ${img.pageNumber}${pageSuffix}`);
                formData.append('disable_notification', 'true');

                const tgRes = await axios.post(
                  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
                  formData,
                  { 
                    headers: formData.getHeaders(), 
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000 
                  }
                );
                
                const result = tgRes.data?.result;
                fileId = result?.photo ? result.photo[result.photo.length - 1]?.file_id : result?.document?.file_id;
                
                if (fileId) {
                  logger.info(`Uploaded slice ${i+1}/${slices.length} for page ${img.pageNumber}. Size: ${buffer.length} bytes`);
                }
              } catch (tgErr) {
                if (tgErr.response && tgErr.response.status === 429) {
                  const retryAfter = (tgErr.response.data.parameters?.retry_after || 60) * 1000;
                  logger.warn(`Rate Limit! Sleeping ${retryAfter/1000}s...`);
                  await sleep(retryAfter);
                  i--; // Retry this slice
                  continue;
                }
                logger.warn(`TG Upload failed for slice ${i+1}: ${img.imageUrl}`, { 
                  error: tgErr.message, 
                  details: tgErr.response?.data 
                });
              }
            }

            // Save/Update DB with sequential page number
            await db.query(
              `INSERT INTO chapter_images (chapter_id, image_url, page_number, telegram_file_id)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (chapter_id, page_number) DO UPDATE 
               SET telegram_file_id = EXCLUDED.telegram_file_id, image_url = EXCLUDED.image_url`,
              [chapterId, img.imageUrl, currentPage, fileId]
            );
            currentPage++;
            
            if (process.env.TELEGRAM_BOT_TOKEN) await sleep(1800); 
          }
        } catch (err) {
          logger.warn(`Failed to process image: ${img.imageUrl}`, { error: err.message });
          // Re-throw so the whole chapter job gets marked as FAILED in BullMQ.
          // BullMQ will try the whole chapter again later, ensuring no missing pages.
          throw err; 
        }
      }
      logger.info(`Saved ${images.length} images for chapter ${chapterNumber} of manga ID ${mangaId}`);

      // NOTIFICATION
      try {
        const subscribers = await db.query(
          "SELECT telegram_chat_id FROM user_subscriptions WHERE manga_id = $1",
          [mangaId]
        );

        if (subscribers.rows.length > 0 && process.env.TELEGRAM_BOT_TOKEN) {
          const mangaRes = await db.query("SELECT title FROM mangas WHERE id = $1", [mangaId]);
          const mangaTitle = mangaRes.rows[0].title;

          for (const sub of subscribers.rows) {
            await axios.post(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                chat_id: sub.telegram_chat_id,
                text: `🔔 Sếp ơi! Bộ "${mangaTitle}" vừa có Chương ${chapterNumber} mới cào xong nè! 😎`,
                reply_markup: {
                  inline_keyboard: [[{
                    text: '📖 Đọc ngay thôi!',
                    url: `http://localhost:3000/chapter/${chapterId}`
                  }]]
                }
              }
            ).catch(() => {});
          }
        }
      } catch (notifyErr) {}
    }
  } catch (err) {
    logger.error(`Job ${job.name} failed for ${url}`, { error: err.message });
    throw err;
  }
}, {
  connection: redisConnection,
  concurrency: 1, // Single worker to strictly follow Telegram limits
  lockDuration: 300000, // 5 minutes for long chapters
  settings: {
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
});

logger.info('Crawler Worker started');
