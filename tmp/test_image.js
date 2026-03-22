const axios = require('axios');

const imageUrl = 'https://image1.kcgsbok.com/nettruyen/thumb/thanh-mai-truc-ma-cua-de-nhat-thien-ha.jpg';

const test = async () => {
  const referers = [
    'https://nettruyenviet1.com/',
    'https://www.nettruyennew.com/',
    'https://www.nettruyenmoi.com/',
    'https://nettruyen.com/',
    'https://nettruyenee.com/',
  ];

  for (const referer of referers) {
    try {
      console.log(`Testing with Referer: ${referer}`);
      const res = await axios.get(imageUrl, {
        headers: {
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });
      console.log(`Success! Status: ${res.status}, Type: ${res.headers['content-type']}`);
      return;
    } catch (err) {
      console.log(`Failed: ${err.message} (Status: ${err.response?.status})`);
    }
  }

  // Final try: No referer
  try {
    console.log(`Testing without Referer`);
    const res = await axios.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });
    console.log(`Success without Referer! Status: ${res.status}, Type: ${res.headers['content-type']}`);
  } catch (err) {
    console.log(`Completely failed: ${err.message}`);
  }
};

test();
