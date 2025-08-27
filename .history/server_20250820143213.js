// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
    init,
    all
} = require("./db");
const {
    main: runScraper
} = require("./scraper");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// init DB
init();

// ===== Helper: klasifikasi pertanyaan =====
const schoolKeywords = [
    "jurusan", "ekstrakurikuler", "ekskul", "guru", "kepala sekolah", "alamat",
    "visi", "misi", "fasilitas", "ppdb", "pendaftaran", "sejarah", "osis",
    "paskibra", "pmr", "pramuka", "website", "jadwal", "kegiatan",
    "perpustakaan", "kontak", "berita"
];

function isSchoolQuestion(q) {
    const t = q.toLowerCase();
    return schoolKeywords.some(k => t.includes(k)) || t.includes("smk") || t.includes("sekolah");
}

function isGeneralEducation(q) {
    const t = q.toLowerCase();
    return [
        "kurikulum", "p5", "magang", "prakerin", "merdeka belajar",
        "smk vs sma", "kejuruan", "kompetensi"
    ].some(k => t.includes(k));
}

// ===== Integrasi Gemini =====
async function askGemini(question, contextStr = "") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Konfigurasi server belum lengkap (GEMINI_API_KEY).";

    const body = {
        contents: [{
            role: "user",
            parts: [{
                text: `Kamu adalah ChatBot resmi sekolah. Jawab singkat, jelas, dan akurat.
Batasan:
- Jika pertanyaan tentang sekolah ini, gunakan konteks yang disediakan.
- Jika pertanyaan pendidikan umum, jawab ringkas dan netral.
- Jika di luar dua topik itu, katakan: "Maaf, saya hanya menjawab informasi sekolah atau pendidikan."

KONTEKS SEKOLAH:
${contextStr.slice(0, 4000)}

Pertanyaan: ${question}`
            }]
        }]
    };

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    const data = await res.json();
    if (data ? .candidates ? . [0] ? .content ? .parts ? . [0] ? .text) {
        return data.candidates[0].content.parts[0].text;
    }
    return data ? .error ? .message || "Gagal mendapatkan jawaban dari AI.";
}

// ===== Build context dari DB =====
async function buildContext() {
    const [statis, jur, eks, news] = await Promise.all([
        all(`SELECT key, value FROM statis`),
        all(`SELECT nama, deskripsi FROM jurusan`),
        all(`SELECT nama, pembina, deskripsi FROM ekskul`),
        all(`SELECT title, link, date FROM berita ORDER BY id DESC LIMIT 5`)
    ]);

    const map = Object.fromEntries(statis.map(s => [s.key, s.value]));
    const jurusanStr = jur.map(j => `• ${j.nama}`).join("\n") || "-";
    const ekskulStr = eks.map(e => `• ${e.nama}`).join("\n") || "-";
    const newsStr = news.map(n => `• ${n.title} (${n.date || "-"}) -> ${n.link}`).join("\n") || "-";

    return `
VISI: ${map.visi || "-"}
MISI: ${map.misi || "-"}
JURUSAN:
${jurusanStr}
EKSKUL:
${ekskulStr}
BERITA TERBARU:
${newsStr}
Sumber: ${process.env.BASE_URL}
.trim();
}

// ===== Endpoint Tanya =====
app.post("/ask", async (req, res) => {
    const q = (req.body ? .question || "").trim(); // ✅ fixed

    if (!q) return res.json({
        answer: "Masukkan pertanyaan."
    });

    try {
        if (isSchoolQuestion(q)) {
            // Coba jawab rule-based
            if (q.toLowerCase().includes("jurusan")) {
                const rows = await all(`SELECT nama FROM jurusan`);
                if (rows.length) {
                    return res.json({
                        answer: "Jurusan yang tersedia:\n- " + rows.map(r => r.nama).join("\n- ")
                    });
                }
            }

            if (q.toLowerCase().includes("ekstrakurikuler") || q.toLowerCase().includes("ekskul")) {
                const rows = await all(`SELECT nama FROM ekskul`);
                if (rows.length) {
                    return res.json({
                        answer: "Ekstrakurikuler:\n- " + rows.map(r => r.nama).join("\n- ")
                    });
                }
            }

            if (q.toLowerCase().includes("berita")) {
                const rows = await all(`SELECT title, link FROM berita ORDER BY id DESC LIMIT 5`);
                if (rows.length) {
                    const list = rows.map(r => `• ${r.title} -> ${r.link}`).join("\n");
                    return res.json({
                        answer: "Berita terbaru:\n" + list
                    });
                }
            }

            // Jika tidak ketemu → pakai Gemini
            const ctx = await buildContext();
            const answer = await askGemini(q, ctx);
            return res.json({
                answer
            });
        }

        if (isGeneralEducation(q)) {
            const answer = await askGemini(q, "Topik: pendidikan umum (kurikulum, SMK, P5, magang).");
            return res.json({
                answer
            });
        }

        // Di luar scope
        return res.json({
            answer: "Maaf, saya hanya menjawab informasi sekolah atau pendidikan."
        });
    } catch (e) {
        console.error(e);
        return res.json({
            answer: "Terjadi kesalahan di server."
        });
    }
});

// ===== Endpoint Refresh Scraping =====
app.post("/refresh", async (req, res) => {
    const token = req.headers["x-refresh-token"];
    if (token !== process.env.REFRESH_TOKEN) {
        return res.status(403).json({
            ok: false,
            message: "Forbidden"
        });
    }

    try {
        await runScraper();
        res.json({
            ok: true,
            message: "Scrape selesai"
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({
            ok: false,
            message: "Gagal scrape"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));
