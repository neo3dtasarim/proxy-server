const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// Firebase Admin SDK'yı başlat (serviceAccount bilgilerinizi ekleyin)
const serviceAccount = require('./serviceAccountKey.json'); // Firebase'den indireceğiniz anahtar
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://<proje-adi>.firebaseio.com'
});
const db = admin.database();

async function getM3u8Url() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // GitHub Actions için gerekli
    headless: true
  });
  const page = await browser.newPage();

  // Ağ isteklerini dinle
  let m3u8Url = null;
  page.on('request', request => {
    const url = request.url();
    if (url.includes('.m3u8') && !url.includes('?')) { // Tokenlı link genelde ? ile gelir, ama yine de yakalayalım
      m3u8Url = url;
      console.log('Yakalanan m3u8:', url);
    }
  });

  // Sayfayı aç ve JS'lerin çalışması için bekle
  await page.goto('https://www.atv.com.tr/canli-yayin', { waitUntil: 'networkidle2', timeout: 60000 });

  // Biraz daha bekle (bazı istekler geç gelebilir)
  await page.waitForTimeout(10000);

  await browser.close();

  if (!m3u8Url) {
    throw new Error('m3u8 linki bulunamadı.');
  }

  return m3u8Url;
}

async function updateFirebase(url) {
  const ref = db.ref('live/atv');
  await ref.set({
    url: url,
    lastUpdated: Date.now()
  });
  console.log('Firebase güncellendi.');
}

(async () => {
  try {
    const url = await getM3u8Url();
    await updateFirebase(url);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
})();
