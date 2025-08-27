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
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.static("public"));

// init DB
init();

// ===== Helper: klasifikasi pertanyaan =====
const schoolKeywords = [
    "jurusan", "ekstrakurikuler", "ekskul", "guru", "kepala sekolah", "alamat",
    "visi", "misi", "fasilitas", "ppdb", "pendaftaran", "sejarah", "osis",
    "paskibra", "pmr", "pramuka", "website", "jadwal", "kegiatan",
    "perpustakaan", "kontak", "berita", "smk syafi'i", "syafi'i akrom"
];

function isSchoolQuestion(q) {
    const t = q.toLowerCase();
    return schoolKeywords.some(k => t.includes(k)) || t.includes("smk") || t.includes("sekolah");
}

function isGeneralEducation(q) {
    const t = q.toLowerCase();
    return [
        "kurikulum", "p5", "magang", "prakerin", "merdeka belajar",
        "smk vs sma", "kejuruan", "kompetensi", "pendidikan", "belajar"
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
                text: `Kamu adalah ChatBot resmi SMK Syafi'i Akrom Pekalongan. Jawab singkat, jelas, dan akurat.
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

    try {
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
        if (data ?.candidates ? . [0] ? .content ? .parts ? . [0] ? .text) {
            return data.candidates[0].content.parts[0].text;
        }
        return data ? .error ? .message || "Gagal mendapatkan jawaban dari AI.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Maaf, sedang ada gangguan pada sistem AI. Silakan coba lagi nanti.";
    }
}

// ===== Build context dari DB =====
async function buildContext() {
    try {
        const [statis, jur, eks, news] = await Promise.all([
            all(`SELECT key, value FROM statis`),
            all(`SELECT nama, deskripsi FROM jurusan`),
            all(`SELECT nama, pembina, deskripsi FROM ekskul`),
            all(`SELECT title, link, date FROM berita ORDER BY id DESC LIMIT 5`)
        ]);

        const map = Object.fromEntries(statis.map(s => [s.key, s.value]));
        const jurusanStr = jur.map(j => `• ${j.nama}: ${j.deskripsi || 'Tidak ada deskripsi'}`).join("\n") || "-";
        const ekskulStr = eks.map(e => `• ${e.nama}${e.pembina ? ` (Pembina: ${e.pembina})` : ''}`).join("\n") || "-";
        const newsStr = news.map(n => `• ${n.title} (${n.date || '-'}) -> ${n.link}`).join("\n") || "-";

        return `
SMK SYAFI'I AKROM PEKALONGAN

VISI: ${map.visi || "Belum tersedia"}
MISI: ${map.misi || "Belum tersedia"}
ALAMAT: ${map.alamat || "Belum tersedia"}
TELEPON: ${map.telp || "Belum tersedia"}
EMAIL: ${map.email || "Belum tersedia"}

JURUSAN:
${jurusanStr}

EKSTRAKURIKULER:
${ekskulStr}

BERITA TERBARU:
${newsStr}

Website: ${process.env.BASE_URL || "https://ponpes-smksa.sch.id/"}
`.trim();
    } catch (error) {
        console.error("Error building context:", error);
        return "Data sekolah belum tersedia.";
    }
}

// ===== Endpoint Tanya =====
app.post("/ask", async (req, res) => {
    const q = (req.body ? .question || "").trim();

    if (!q) {
        return res.json({
            answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
            quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler"]
        });
    }

    try {
        let quickReplies = ["Info jurusan", "Info PPDB", "Kontak sekolah"];

        // Cek pertanyaan salam
        if (["halo", "hai", "hello", "hi", "selamat", "pagi", "siang", "sore", "malam"].some(word =>
                q.toLowerCase().includes(word))) {
            return res.json({
                answer: "Halo! 👋 Saya adalah chatbot SMK Syafi'i Akrom. Ada yang bisa saya bantu?\n\nAnda bisa menanyakan tentang:\n• Informasi jurusan\n• PPDB dan pendaftaran\n• Ekstrakurikuler\n• Fasilitas sekolah\n• Berita terbaru",
                quickReplies: quickReplies
            });
        }

        if (isSchoolQuestion(q)) {
            // Handle pertanyaan jurusan
            if (q.toLowerCase().includes("jurusan")) {
                const rows = await all(`SELECT nama, deskripsi FROM jurusan`);
                if (rows.length) {
                    let jawaban = "🎓 **JURUSAN SMK SYAFI'I AKROM**\n\n";

                    rows.forEach((jurusan, index) => {
                        jawaban += `**${index + 1}. ${jurusan.nama}**\n`;
                        jawaban += `   📝 ${jurusan.deskripsi || 'Deskripsi sedang diperbarui'}\n\n`;
                    });

                    jawaban += "🔗 **Info lengkap:** https://ponpes-smksa.sch.id/jurusan/";

                    quickReplies = rows.map(r => `Detail ${r.nama}`).slice(0, 3);

                    return res.json({
                        answer: jawaban,
                        quickReplies: quickReplies
                    });
                }
            }

            // Handle pertanyaan ekstrakurikuler
            if (q.toLowerCase().includes("ekstrakurikuler") || q.toLowerCase().includes("ekskul")) {
                const rows = await all(`SELECT nama, pembina, deskripsi FROM ekskul`);
                if (rows.length) {
                    let jawaban = "⚽ **EKSTRAKURIKULER**\n\n";

                    rows.forEach((ekskul, index) => {
                        jawaban += `**${index + 1}. ${ekskul.nama}**\n`;
                        if (ekskul.pembina) jawaban += `   👨‍🏫 Pembina: ${ekskul.pembina}\n`;
                        if (ekskul.deskripsi) jawaban += `   📋 ${ekskul.deskripsi}\n`;
                        jawaban += "\n";
                    });

                    quickReplies = rows.map(r => `Info ${r.nama}`).slice(0, 3);

                    return res.json({
                        answer: jawaban,
                        quickReplies: quickReplies
                    });
                }
            }

            // Handle pertanyaan berita
            if (q.toLowerCase().includes("berita") || q.toLowerCase().includes("info terbaru")) {
                const rows = await all(`SELECT title, link, date FROM berita ORDER BY id DESC LIMIT 5`);
                if (rows.length) {
                    let jawaban = "📰 **BERITA TERBARU**\n\n";

                    rows.forEach((berita, index) => {
                        jawaban += `**${index + 1}. ${berita.title}**\n`;
                        if (berita.date) jawaban += `   📅 ${berita.date}\n`;
                        jawaban += `   🔗 ${berita.link}\n\n`;
                    });

                    return res.json({
                        answer: jawaban,
                        quickReplies: ["Berita lainnya", "Info PPDB", "Jurusan"]
                    });
                }
            }

            // Handle pertanyaan PPDB
            if (q.toLowerCase().includes("ppdb") || q.toLowerCase().includes("pendaftaran")) {
                const ppdbInfo = await all(`SELECT value FROM statis WHERE key = 'ppdb_info'`);
                let jawaban = "🎯 **INFORMASI PPDB**\n\n";

                if (ppdbInfo.length) {
                    jawaban += ppdbInfo[0].value;
                } else {
                    jawaban += "Informasi PPDB sedang diperbarui.\n\n";
                    jawaban += "🔗 **Untuk info pendaftaran terbaru, kunjungi:**\n";
                    jawaban += "https://ponpes-smksa.sch.id/ppdb/\n\n";
                    jawaban += "📞 **Hubungi:**\n";
                    jawaban += "Panitia PPDB SMK Syafi'i Akrom";
                }

                return res.json({
                    answer: jawaban,
                    quickReplies: ["Syarat pendaftaran", "Biaya pendidikan", "Jadwal PPDB"]
                });
            }

            // Handle pertanyaan kontak
            if (q.toLowerCase().includes("kontak") || q.toLowerCase().includes("alamat") || q.toLowerCase().includes("telpon")) {
                const rows = await all(`SELECT key, value FROM statis WHERE key IN ('alamat', 'telp', 'email')`);
                const info = Object.fromEntries(rows.map(r => [r.key, r.value]));

                let jawaban = "📞 **KONTAK SEKOLAH**\n\n";
                jawaban += `📍 **Alamat:** ${info.alamat || 'Jl. Raya Pekalongan'}\n`;
                jawaban += `📞 **Telepon:** ${info.telp || '(0285) 1234567'}\n`;
                jawaban += `📧 **Email:** ${info.email || 'info@smksa.sch.id'}\n\n`;
                jawaban += "🌐 **Website:** https://ponpes-smksa.sch.id/";

                return res.json({
                    answer: jawaban,
                    quickReplies: ["Info jurusan", "PPDB", "Ekstrakurikuler"]
                });
            }

            // Jika tidak ada yang cocok, gunakan Gemini dengan context
            const ctx = await buildContext();
            const answer = await askGemini(q, ctx);

            return res.json({
                answer: answer,
                quickReplies: quickReplies
            });
        }

        if (isGeneralEducation(q)) {
            const answer = await askGemini(q, "Topik: pendidikan umum (kurikulum, SMK, P5, magang, prakerin).");
            return res.json({
                answer: answer,
                quickReplies: ["Info jurusan", "PPDB SMK", "Kegiatan sekolah"]
            });
        }

        // Di luar scope
        return res.json({
            answer: "Maaf, saya hanya menjawab informasi seputar SMK Syafi'i Akrom dan pendidikan umum.\n\nCoba tanyakan tentang:\n• Jurusan yang tersedia\n• Informasi PPDB\n• Ekstrakurikuler\n• Fasilitas sekolah\n• Berita terbaru",
            quickReplies: ["Info jurusan", "PPDB", "Ekstrakurikuler"]
        });

    } catch (e) {
        console.error("Error in /ask endpoint:", e);
        return res.json({
            answer: "Maaf, sedang terjadi gangguan teknis. Silakan coba lagi dalam beberapa saat.",
            quickReplies: []
        });
    }
});

// ===== Endpoint Health Check =====
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
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
            message: "Scrape selesai dan data diperbarui"
        });
    } catch (e) {
        console.error("Refresh error:", e);
        res.status(500).json({
            ok: false,
            message: "Gagal melakukan scraping: " + e.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Chatbot endpoint: http://localhost:${PORT}/ask`);
});