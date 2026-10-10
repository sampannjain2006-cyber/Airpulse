const urls = [
  'https://cpcb.nic.in/national-air-quality-index/',
  'https://cpcb.nic.in/air-quality-standards/',
  'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
  'https://www.who.int/publications/i/item/9789240034228'
];

async function checkUrls() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`URL: ${url} -> Status: ${res.status} (${res.statusText})`);
    } catch (err) {
      console.log(`URL: ${url} -> Error: ${err.message}`);
    }
  }
}

checkUrls();
