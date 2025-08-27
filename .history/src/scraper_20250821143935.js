// scraper.js
require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const db = require("./db");

const BASE_URL = process.env.BASE_URL || "https://ponpes-smksa.sch.id";

// Config untuk scraping
const SCRAPER_CONFIG = {
    timeout: 30000, // 30 detik timeout
    retries: 2, // Jumlah retry jika gagal
    userAgent: "Mozilla/5.0 (compatible; SMKScraper/1.0; +https://ponpes-smksa.sch.id)"
};

// Helper function untuk fetch dengan retry
async function fetchWithRetry(url, retries = SCRAPER_CONFIG.retries) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                timeout: SCRAPER_CONFIG.timeout,
                headers: {
                    'User-Agent': SCRAPER_CONFIG.userAgent
                }
            });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`🔄 Retry ${i + 1}/${retries} untuk: ${url}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
        }
    }
}

async function scrapeBeranda() {
    try {
        console.log("📰 Scraping beranda...");
        const response = await fetchWithRetry(BASE_URL);
        const $ = cheerio.load(response.data);

        const items = [];

        // Multiple selector strategies untuk berita
        const selectors = [
            ".post",
            "article",
            ".blog-item",
            ".entry",
            ".news-item",
            "[class*='post']",
            "[class*='article']"
        ];

        selectors.forEach(selector => {
            $(selector).slice(0, 10).each((_, el) => {
                try {
                    const titleElement = $(el).find("h2, h3, .title, .entry-title").first();
                    const title = titleElement.text().trim();
                    const link = $(el).find("a").first().attr("href");

                    if (title && link && title.length > 5) {
                        const date = $(el).find(".date, time, .posted-on, [class*='date']").first().text().trim();
                        const excerpt = $(el).find("p, .excerpt, .entry-content, .summary").first().text().trim().substring(0, 200);

                        const absoluteLink = link.startsWith('http') ? link : `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;

                        // Cek duplikat
                        if (!items.some(item => item.title === title || item.link === absoluteLink)) {
                            items.push({
                                title,
                                link: absoluteLink,
                                date,
                                excerpt
                            });
                        }
                    }
                } catch (error) {
                    // Skip element jika error
                }
            });
        });

        console.log(`📊 Found ${items.length} news items`);

        // Simpan ke database
        let savedCount = 0;
        for (const it of items) {
            try {
                const result = await db.run(
                    `INSERT OR IGNORE INTO berita (title, link, date, excerpt) VALUES (?, ?, ?, ?)`,
                    [it.title, it.link, it.date || "", it.excerpt || ""]
                );
                if (result.changes > 0) savedCount++;
            } catch (error) {
                console.error("❌ Error saving news item:", error.message);
            }
        }

        console.log(`✅ Saved ${savedCount} new news items`);
        return savedCount;

    } catch (error) {
        console.error("❌ Error scraping beranda:", error.message);
        return 0;
    }
}

async function scrapeProfilSekolah() {
    const urlsToTry = [
        `${BASE_URL}/profile-sekolah/`,
        `${BASE_URL}/profile-sekolah/keadaan-sekolah/`,
        `${BASE_URL}/profile-sekolah/sarana-prasarana/`,
        `${BASE_URL}/profile-sekolah/visi-misi/`
    ];

    console.log("🏫 Scraping profil sekolah...");

    for (const url of urlsToTry) {
        try {
            const response = await fetchWithRetry(url);
            const $ = cheerio.load(response.data);

            const content = $("main, .entry-content, .content, article, .page-content").text().replace(/\s+/g, " ").trim();

            // Improved pattern matching untuk visi-misi
            const visiMatch = content.match(/Visi[:\-]?\s*([^\.!?]+[\.!?])/i);
            const misiMatch = content.match(/Misi[:\-]?\s*((?:[^\.!?]+[\.!?]){1,5})/i);

            const visi = visiMatch ? visiMatch[1].trim() : "";
            const misi = misiMatch ? misiMatch[1].trim() : "";

            if (visi) {
                await db.run(
                    `INSERT INTO statis (key, value) VALUES ('visi', ?) 
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [visi]
                );
                console.log("✅ Found and saved visi");
            }

            if (misi) {
                await db.run(
                    `INSERT INTO statis (key, value) VALUES ('misi', ?) 
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [misi]
                );
                console.log("✅ Found and saved misi");
            }

            // Cari alamat dan kontak
            const addressMatch = content.match(/Alamat[:\-]?\s*([^\.!?]+[\.!?])/i);
            const phoneMatch = content.match(/Telepon[:\-]?\s*([\d\s\(\)\-\+]+)/i);
            const emailMatch = content.match(/Email[:\-]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

            if (addressMatch) {
                await db.run(
                    `INSERT INTO statis (key, value) VALUES ('alamat', ?) 
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [addressMatch[1].trim()]
                );
            }

            if (phoneMatch) {
                await db.run(
                    `INSERT INTO statis (key, value) VALUES ('telp', ?) 
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [phoneMatch[1].trim()]
                );
            }

            if (emailMatch) {
                await db.run(
                    `INSERT INTO statis (key, value) VALUES ('email', ?) 
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [emailMatch[1].trim()]
                );
            }

            console.log("✅ Successfully scraped profile from:", url);
            return true;

        } catch (error) {
            console.log(`⏩ Skip ${url}: ${error.message}`);
        }
    }

    console.log("❌ Could not find profile information");
    return false;
}

async function scrapeJurusan() {
    const urlsToTry = [
        `${BASE_URL}/jurusan/`,
        `${BASE_URL}/jurusan/teknik-komputer-jaringan/`,
        `${BASE_URL}/jurusan/teknik-kendaraan-ringan/`,
        `${BASE_URL}/jurusan/teknik-sepeda-motor/`,
        `${BASE_URL}/jurusan/busana-butik/ `,
    ];

    console.log("🎓 Scraping jurusan...");

    for (const url of urlsToTry) {
        try {
            const response = await fetchWithRetry(url);
            const $ = cheerio.load(response.data);

            const jurusanData = [];

            // Multiple selector strategies untuk jurusan
            const selectors = [
                ".jurusan", ".program", ".card", "article", ".item",
                "[class*='jurusan']", "[class*='program']", "[class*='keahlian']"
            ];

            selectors.forEach(selector => {
                $(selector).each((_, el) => {
                    try {
                        const nama = $(el).find("h2, h3, h4, .title, .name, [class*='title']").first().text().trim();
                        const deskripsi = $(el).find("p, .description, .desc, .text, [class*='desc']").first().text().trim();

                        if (nama && nama.length > 3 && !jurusanData.some(j => j.nama === nama)) {
                            jurusanData.push({
                                nama: nama,
                                deskripsi: deskripsi || `Jurusan ${nama} di SMK Syafi'i Akrom`
                            });
                        }
                    } catch (error) {
                        // Skip element jika error
                    }
                });
            });

            console.log(`📊 Found ${jurusanData.length} jurusan`);

            // Simpan ke database
            let savedCount = 0;
            for (const jurusan of jurusanData) {
                try {
                    const result = await db.run(
                        `INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES (?, ?)`,
                        [jurusan.nama, jurusan.deskripsi]
                    );
                    if (result.changes > 0) savedCount++;
                } catch (error) {
                    console.error("❌ Error saving jurusan:", error.message);
                }
            }

            console.log(`✅ Saved ${savedCount} new jurusan`);
            return savedCount;

        } catch (error) {
            console.log(`⏩ Skip ${url}: ${error.message}`);
        }
    }

    return 0;
}

async function scrapeEkskul() {
    const urlsToTry = [
        `${BASE_URL}/ekstrakurikuler/`,
        `${BASE_URL}/ekskul/`,
        `${BASE_URL}/kegiatan/`,
        `${BASE_URL}/extracurricular/`
    ];

    console.log("⚽ Scraping ekstrakurikuler...");

    for (const url of urlsToTry) {
        try {
            const response = await fetchWithRetry(url);
            const $ = cheerio.load(response.data);

            const ekskulData = [];

            // Multiple selector strategies untuk ekskul
            const selectors = [
                ".ekskul", ".extracurricular", ".card", "article", ".item",
                "[class*='ekskul']", "[class*='extracurricular']"
            ];

            selectors.forEach(selector => {
                $(selector).each((_, el) => {
                    try {
                        const nama = $(el).find("h2, h3, h4, .title, .name").first().text().trim();
                        const deskripsi = $(el).find("p, .description, .desc").first().text().trim();
                        const pembina = $(el).find("[class*='pembina'], [class*='pembimbing'], [class*='coach']").first().text().trim();

                        if (nama && nama.length > 3 && !ekskulData.some(e => e.nama === nama)) {
                            ekskulData.push({
                                nama: nama,
                                deskripsi: deskripsi || `Kegiatan ekstrakurikuler ${nama}`,
                                pembina: pembina || ""
                            });
                        }
                    } catch (error) {
                        // Skip element jika error
                    }
                });
            });

            console.log(`📊 Found ${ekskulData.length} ekskul`);

            // Simpan ke database
            let savedCount = 0;
            for (const ekskul of ekskulData) {
                try {
                    const result = await db.run(
                        `INSERT OR IGNORE INTO ekskul (nama, deskripsi, pembina) VALUES (?, ?, ?)`,
                        [ekskul.nama, ekskul.deskripsi, ekskul.pembina]
                    );
                    if (result.changes > 0) savedCount++;
                } catch (error) {
                    console.error("❌ Error saving ekskul:", error.message);
                }
            }

            console.log(`✅ Saved ${savedCount} new ekskul`);
            return savedCount;

        } catch (error) {
            console.log(`⏩ Skip ${url}: ${error.message}`);
        }
    }

    return 0;
}

async function scrapeKontak() {
    console.log("📞 Scraping kontak...");

    try {
        const response = await fetchWithRetry(BASE_URL);
        const $ = cheerio.load(response.data);

        // Cari di footer
        const footerText = $("footer, .footer").text();

        // Cari di section kontak
        const contactText = $("[class*='contact'], [class*='kontak'], [class*='alamat']").text();

        const fullText = footerText + " " + contactText;

        // Improved regex patterns
        const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        const phoneMatch = fullText.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}/g);
        const addressMatch = fullText.match(/Alamat[:\-]?\s*([^\n\.!?]+[\.!?])/i);

        let savedCount = 0;

        if (emailMatch) {
            await db.run(
                `INSERT INTO statis (key, value) VALUES ('email', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [emailMatch[0]]
            );
            savedCount++;
            console.log("✅ Found email:", emailMatch[0]);
        }

        if (phoneMatch) {
            await db.run(
                `INSERT INTO statis (key, value) VALUES ('telp', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [phoneMatch[0]]
            );
            savedCount++;
            console.log("✅ Found phone:", phoneMatch[0]);
        }

        if (addressMatch && addressMatch[1]) {
            await db.run(
                `INSERT INTO statis (key, value) VALUES ('alamat', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [addressMatch[1].trim()]
            );
            savedCount++;
            console.log("✅ Found address:", addressMatch[1].trim());
        }

        console.log(`✅ Saved ${savedCount} contact information`);
        return savedCount > 0;

    } catch (error) {
        console.error("❌ Error scraping kontak:", error.message);
        return false;
    }
}

async function main() {
    try {
        console.log("🚀 Starting comprehensive scraping...");
        console.log("🌐 Target website:", BASE_URL);
        console.log("⏰ Timeout:", SCRAPER_CONFIG.timeout, "ms");
        console.log("🔄 Retries:", SCRAPER_CONFIG.retries);
        console.log("=".repeat(50));

        const startTime = Date.now();

        const results = await Promise.allSettled([
            scrapeBeranda(),
            scrapeProfilSekolah(),
            scrapeJurusan(),
            scrapeEkskul(),
            scrapeKontak()
        ]);

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log("\n" + "=".repeat(50));
        console.log("📊 FINAL SCRAPING RESULTS:");
        console.log("=".repeat(50));

        const resultNames = ["Berita", "Profil", "Jurusan", "Ekskul", "Kontak"];

        results.forEach((result, index) => {
            const status = result.status === 'fulfilled' ? '✅' : '❌';
            const value = result.status === 'fulfilled' ? result.value : result.reason.message;
            console.log(`${status} ${resultNames[index]}: ${value}`);
        });

        console.log("=".repeat(50));
        console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
        console.log(`🎉 Scraping completed at: ${new Date().toISOString()}`);

    } catch (error) {
        console.error("💥 Critical error in scraping process:", error);
        throw error;
    }
}

// Function untuk scraping tunggal
async function scrapeSection(sectionName) {
    const sections = {
        'berita': scrapeBeranda,
        'profil': scrapeProfilSekolah,
        'jurusan': scrapeJurusan,
        'ekskul': scrapeEkskul,
        'kontak': scrapeKontak
    };

    if (sections[sectionName]) {
        console.log(`🔍 Scraping only: ${sectionName}`);
        return await sections[sectionName]();
    } else {
        console.log("❌ Invalid section. Available: berita, profil, jurusan, ekskul, kontak");
        return null;
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const section = args[0];

    if (section) {
        scrapeSection(section).catch(console.error);
    } else {
        main().catch((error) => {
            console.error("💥 Scraping failed:", error.message);
            process.exit(1);
        });
    }
}

module.exports = {
    main,
    scrapeBeranda,
    scrapeProfilSekolah,
    scrapeJurusan,
    scrapeEkskul,
    scrapeKontak,
    scrapeSection
};