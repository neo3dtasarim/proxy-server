const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// 1. Firebase Anahtarını Al
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://deneme-48ef5-default-rtdb.firebaseio.com"
});

const db = admin.database();

(async () => {
    console.log("1. Tarayıcı hazırlanıyor...");
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] 
    });
    const page = await browser.newPage();
    
    // Gerçek bir kullanıcı gibi görünüyoruz
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let linkBulundu = false;

    // Ağı (Network) dinliyoruz
    page.on('request', async (request) => {
        const url = request.url();
        // m3u8 veya daioncdn (Turkuvaz Medya sunucusu) gördüğümüz an yakalıyoruz
        if ((url.includes('.m3u8') || url.includes('trkvz.daioncdn.net')) && !linkBulundu) {
            linkBulundu = true;
            console.log('\n--- 2. BULDUM! ALTIN LİNK ---');
            console.log(url);

            try {
                await db.ref('canli_yayin').set({
                    m3u8_url: url,
                    guncelleme_tarihi: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
                });
                console.log('3. FİREBASE BAŞARIYLA GÜNCELLENDİ!\n');
            } catch (err) {
                console.error('Firebase yazma hatası:', err);
            }

            await browser.close();
            process.exit(0);
        }
    });

    console.log("4. Hedef siteye bağlanılıyor: ATV Resmi Sitesi...");
    try {
        // ATV'nin resmi adresine gidiyoruz
        await page.goto('https://www.atv.com.tr/canli-yayin', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("5. Sayfa açıldı, arka planda video oynatıcının yüklenmesi bekleniyor...");
        
        // Site açıldıktan sonra maksimum 45 saniye bekle
        setTimeout(async () => {
            if (!linkBulundu) {
                console.log('6. Süre doldu, link sayfaya düşmedi.');
                await browser.close();
                process.exit(1);
            }
        }, 45000);

    } catch (e) {
        console.error('7. Sayfaya girerken hata oluştu:', e.message);
        await browser.close();
        process.exit(1);
    }
})();
