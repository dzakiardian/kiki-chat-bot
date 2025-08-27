// scraper.js
require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const {
    init,
    run,
    setStatis,
    all
} = require("./db");

const BASE_URL = process.env.BASE_URL;

// async function scrapeBeranda() {
//     const {
//         data: html
//     } = await axios.get(BASE_URL);
//     const $ = cheerio.load(html);

//     // Coba ambil beberapa berita terbaru (sesuaikan selector dengan web kamu)
//     const items = [];
//     $("article").slice(0, 6).each((_, el) => {
//         const title = $(el).find(".entry-title a, h2 a").first().text().trim();
//         const link = $(el).find(".entry-title a, h2 a").first().attr("href");
//         const date = $(el).find("time, .entry-date").first().text().trim();
//         const excerpt = $(el).find(".entry-content p, .post-excerpt, p").first().text().trim();
//         if (title && link) items.push({
//             title,
//             link,
//             date,
//             excerpt
//         });
//     });

//     for (const it of items) {
//         await run(
//             `INSERT OR IGNORE INTO berita(title,link,date,excerpt) VALUES(?,?,?,?)`,
//             [it.title, it.link, it.date || "", it.excerpt || ""]
//         );
//     }
// }

// [IN scraper.js] MODIFY WITH CORRECT SELECTORS
async function scrapeBeranda() {
    const {
        data: html
    } = await axios.get("https://ponpes-smksa.sch.id/");
    const $ = cheerio.load(html);

    const items = [];
    // Coba selector yang sesuai dengan website kamu
    $(".post, article, .blog-item").slice(0, 5).each((_, el) => {
        const title = $(el).find("h2, h3, .title").first().text().trim();
        const link = $(el).find("a").first().attr("href");
        const date = $(el).find(".date, time").first().text().trim();
        const excerpt = $(el).find("p, .excerpt").first().text().trim();

        if (title && link) items.push({
            title,
            link,
            date,
            excerpt
        });
    });

    for (const it of items) {
        await run(
            `INSERT OR IGNORE INTO berita(title,link,date,excerpt) VALUES(?,?,?,?)`,
            [it.title, it.link, it.date || "", it.excerpt || ""]
        );
    }
}

async function scrapeProfilSekolah() {
    // Contoh: kalau ada halaman "Profil" / "Tentang"
    // Ganti URL-nya agar sesuai
    const url = `${BASE_URL}/profil/`;
    try {
        const {
            data: html
        } = await axios.get(url);
        const $ = cheerio.load(html);
        const teks = $("main, .entry-content, .content, article").text().replace(/\s+/g, " ").trim();

        // Cari pola sederhana untuk Visi & Misi
        const visi = ((teks.match(/Visi[:\-]?\s*(.*?)(Misi|Tujuan|$)/i) || [])[1] || "").trim();
        const misiRaw = ((teks.match(/Misi[:\-]?\s*(.*)/i) || [])[1] || "").trim();
        await setStatis("visi", visi || "Visi belum tersedia");
        await setStatis("misi", misiRaw || "Misi belum tersedia");
    } catch {
        // abaikan jika tidak ada
    }
}

async function scrapeJurusan() {
    // Contoh: halaman daftar jurusan
    const url = `${BASE_URL}/jurusan/`;
    try {
        const {
            data: html
        } = await axios.get(url);
        const $ = cheerio.load(html);

        // Misal setiap jurusan dalam .card atau article
        const blocks = $("article, .card, .jurusan-item");
        for (const el of blocks) {
            const nama =
                $(el).find("h2, h3, .title, .entry-title").first().text().trim() ||
                $(el).find("a").first().text().trim();
            const deskripsi =
                $(el).find("p").first().text().trim() ||
                $(el).text().trim().slice(0, 300);

            if (nama) {
                await run(
                    `INSERT OR IGNORE INTO jurusan(nama,deskripsi) VALUES(?,?)`,
                    [nama, deskripsi]
                );
            }
        }
    } catch {
        // abaikan jika tidak ada
    }
}

async function scrapeEkskul() {
    // Contoh: halaman ekstrakurikuler
    const url = `${BASE_URL}/ekstrakurikuler/`;
    try {
        const {
            data: html
        } = await axios.get(url);
        const $ = cheerio.load(html);

        $("article, .card, .ekskul-item").each(async (_, el) => {
            const nama =
                $(el).find("h2, h3, .title, .entry-title").first().text().trim() ||
                $(el).find("a").first().text().trim();
            const deskripsi = $(el).find("p").first().text().trim();
            if (nama) {
                await run(
                    `INSERT OR IGNORE INTO ekskul(nama,pembina,deskripsi) VALUES(?,?,?)`,
                    [nama, "", deskripsi]
                );
            }
        });
    } catch {
        // abaikan jika tidak ada
    }
}

async function main() {
    init();
    console.log("⏳ Scraping mulai…");
    await scrapeBeranda();
    await scrapeProfilSekolah();
    await scrapeJurusan();
    await scrapeEkskul();
    console.log("✅ Selesai scraping & simpan ke SQLite");
}

if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = {
    main
};
