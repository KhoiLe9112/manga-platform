const { mangaQueue } = require('./shared/queue');

async function trigger() {
  await mangaQueue.add('crawl-manga-detail', { 
    url: 'https://nettruyenviet1.com/truyen-tranh/giao-duc-chan-chinh', 
    slug: 'giao-duc-chan-chinh',
    cover: 'https://nettruyenviet1.com/assets/images/nettruyenviet.webp' // placeholder
  });
  console.log('Finished triggering crawl-manga-detail for giao-duc-chan-chinh');
  process.exit(0);
}

trigger();
