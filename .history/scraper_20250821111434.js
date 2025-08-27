// scraper.js
require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const db = require("./db"); // ✅ Updated import

const BASE_URL = process.env.BASE_URL || "https://ponpes-smksa.sch.id";

async function scrapeBeranda() {
    try {
        const {
            data: html
        } = await axios.get(BASE_URL);
        const $ = cheerio.load(html);

        const items = [];
        // Coba selector yang sesuai dengan website kamu
        $(".post, article, .blog-item, .entry").slice(0, 8).each((_, el) => {
            const title = $(el).find("h2, h3, .title, .entry-title").first().text().trim();
            const link = $(el).find("a").first().attr("href");
            const date = $(el).find(".date, time, .posted-on").first().text().trim();
            const excerpt = $(el).find("p, .excerpt, .entry-content").first().text().trim().substring(0, 200);

            if (title && link) {
                // Pastikan link absolute
                const absoluteLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                items.push({
                    title,
                    link: absoluteLink,
                    date,
                    excerpt
                });
            }
        });

        for (const it of items) {
            await db.run(
                `INSERT OR IGNORE INTO berita (title, link, date, excerpt) VALUES (?, ?, ?, ?)`,
                [it.title, it.link, it.date || "", it.excerpt || ""]
            );
        }

        console.log(`✅ Scraped ${items.length} news items`);
        return items.length;
    } catch (error) {
        console.error("❌ Error scraping beranda:", error.message);
        return 0;
    }
}

async function scrapeProfilSekolah() {
    const urlsToTry = [
        `${BASE_URL}/profil/`,
        `${BASE_URL}/tentang/`,
        `${BASE_URL}/about/`,
        `${BASE_URL}/sejarah/`
    ];

    for (const url of urlsToTry) {
        try {
            const {
                data: html
            } = await axios.get(url);
            const $ = cheerio.load(html);
            const teks = $("main, .entry-content, .content, article").text().replace(/\s+/g, " ").trim();

            // Cari pola sederhana untuk Visi & Misi
            const visiMatch = teks.match(/Visi[:\-]?\s*(.*?)(?=Misi|Tujuan|$)/i);
            const misiMatch = teks.match(/Misi[:\-]?\s*(.*?)(?=Visi|Tujuan|$)/i);

            const visi = visiMatch ? visiMatch[1].trim() : "";
            const misi = misiMatch ? misiMatch[1].trim() : "";

            if (visi) await db.run(
                `INSERT INTO statis (key, value) VALUES ('visi', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [visi]
            );

            if (misi) await db.run(
                `INSERT INTO statis (key, value) VALUES ('misi', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [misi]
            );

            console.log("✅ Scraped profil sekolah dari:", url);
            return true;
        } catch (error) {
            console.log(`⏩ Skip ${url}: ${error.message}`);
        }
    }
    return false;
}

async function scrapeJurusan() {
    const urlsToTry = [
        `${BASE_URL}/jurusan/`,
        `${BASE_URL}/program/`,
        `${BASE_URL}/keahlian/`
    ];

    for (const url of urlsToTry) {
        try {
            const {
                data: html
            } = await axios.get(url);
            const $ = cheerio.load(html);

            const jurusanData = [];
            // Coba berbagai selector untuk jurusan
            $(".jurusan, .program, .card, article, .item").each((_, el) => {
                const nama = $(el).find("h2, h3, h4, .title, .name").first().text().trim();
                const deskripsi = $(el).find("p, .description, .desc, .text").first().text().trim();

                if (nama && nama.length > 2) {
                    jurusanData.push({
                        nama: nama,
                        deskripsi: deskripsi || `Jurusan ${nama} di SMK Syafi'i Akrom`
                    });
                }
            });

            for (const jurusan of jurusanData) {
                await db.run(
                    `INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES (?, ?)`,
                    [jurusan.nama, jurusan.deskripsi]
                );
            }

            console.log(`✅ Scraped ${jurusanData.length} jurusan dari: ${url}`);
            return jurusanData.length;
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
        `${BASE_URL}/kegiatan/`
    ];

    for (const url of urlsToTry) {
        try {
            const {
                data: html
            } = await axios.get(url);
            const $ = cheerio.load(html);

            const ekskulData = [];
            $(".ekskul, .extracurricular, .card, article, .item").each((_, el) => {
                const nama = $(el).find("h2, h3, h4, .title, .name").first().text().trim();
                const deskripsi = $(el).find("p, .description, .desc").first().text().trim();

                if (nama && nama.length > 2) {
                    ekskulData.push({
                        nama: nama,
                        deskripsi: deskripsi || `Kegiatan ekstrakurikuler ${nama}`
                    });
                }
            });

            for (const ekskul of ekskulData) {
                await db.run(
                    `INSERT OR IGNORE INTO ekskul (nama, deskripsi) VALUES (?, ?)`,
                    [ekskul.nama, ekskul.deskripsi]
                );
            }

            console.log(`✅ Scraped ${ekskulData.length} ekskul dari: ${url}`);
            return ekskulData.length;
        } catch (error) {
            console.log(`⏩ Skip ${url}: ${error.message}`);
        }
    }
    return 0;
}

async function scrapeKontak() {
    try {
        const {
            data: html
        } = await axios.get(BASE_URL);
        const $ = cheerio.load(html);

        // Cari informasi kontak di footer atau section khusus
        const footerText = $("footer, .footer, .contact, .kontak").text();

        // Regex patterns untuk menemukan informasi kontak
        const emailMatch = footerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = footerText.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}/);

        if (emailMatch) {
            await db.run(
                `INSERT INTO statis (key, value) VALUES ('email', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [emailMatch[0]]
            );
        }

        if (phoneMatch) {
            await db.run(
                `INSERT INTO statis (key, value) VALUES ('telp', ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [phoneMatch[0]]
            );
        }

        console.log("✅ Scraped contact information");
        return true;
    } catch (error) {
        console.error("❌ Error scraping kontak:", error.message);
        return false;
    }
}

async function main() {
    try {
        console.log("⏳ Memulai scraping...");
        console.log("🌐 Target website:", BASE_URL);

        const results = await Promise.allSettled([
            scrapeBeranda(),
            scrapeProfilSekolah(),
            scrapeJurusan(),
            scrapeEkskul(),
            scrapeKontak()
        ]);

        console.log("\n📊 Hasil Scraping:");
        console.log("✅ Berita:", results[0].status === 'fulfilled' ? results[0].value : 'Gagal');
        console.log("✅ Profil:", results[1].status === 'fulfilled' ? 'Berhasil' : 'Gagal');
        console.log("✅ Jurusan:", results[2].status === 'fulfilled' ? results[2].value : 'Gagal');
        console.log("✅ Ekskul:", results[3].status === 'fulfilled' ? results[3].value : 'Gagal');
        console.log("✅ Kontak:", results[4].status === 'fulfilled' ? 'Berhasil' : 'Gagal');

        console.log("\n🎉 Scraping selesai!");

    } catch (error) {
        console.error("❌ Error dalam proses scraping:", error);
        throw error;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error("💥 Scraping gagal:", error.message);
        process.exit(1);
    });
}

module.exports = {
    main,
    scrapeBeranda,
    scrapeProfilSekolah,
    scrapeJurusan,
    scrapeEkskul,
    scrapeKontak
};