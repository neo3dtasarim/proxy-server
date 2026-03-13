const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// GitHub'ın kasasından Firebase anahtarını alıyoruz
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Firebase'e bağlanıyoruz (Senin veritabanı linkin)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://deneme-48ef5-default-rtdb.firebaseio.com" 
});

const db = admin.database();

(async () => {
    console.log("Chrome arka planda başlatılıyor...");
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    let linkBulundu = false;

    // Ağı (Network) dinliyoruz
    page.on('request', async (request) => {
        const url = request.url();
        // .m3u8 veya daioncdn linkini gördüğümüz an yapışıyoruz
        if ((url.includes('.m3u8') || url.includes('trkvz.daioncdn.net')) && !linkBulundu) {
            linkBulundu = true;
            console.log('BULDUM! Altın Link:', url);

            // Firebase'e Gönder
            await db.ref('canli_yayin').set({
                m3u8_url: url,
                guncelleme_tarihi: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
            });

            console.log('Firebase başarıyla güncellendi. Hedef yok edildi!');
            await browser.close();
            process.exit(0);
        }
    });

    console.log("Hedef siteye giriliyor...");
    try {
        await page.goto('https://www.atv.com.tr/canli-yayin', { waitUntil: 'networkidle2', timeout: 45000 });
        
        // 30 saniye içinde link çıkmazsa kapat
        setTimeout(async () => {
            if (!linkBulundu) {
                console.log('Link bulunamadı, site geç tepki verdi.');
                await browser.close();
                process.exit(1);
            }
        }, 30000);
    } catch (e) {
        console.error('Hata:', e);
        process.exit(1);
    }
})();
