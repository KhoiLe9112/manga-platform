const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://nettruyenviet1.com/truyen-tranh/giao-duc-chan-chinh', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
}).then(res => {
  const $ = cheerio.load(res.data);
  const chapters = $('#nt_listchapter nav > ul > li');
  console.log("CHAPTER_COUNT:", chapters.length);
}).catch(console.error);
