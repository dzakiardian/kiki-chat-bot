require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require('path');
const db = require("./JS/db");
const {
    getAnswer
} = require("./JS/bot");
const axios = require("axios");

const app = express(); // ✅ INI HARUS DULUAN
const PORT = process.env.PORT || 3001;
const patterns = {
    'jurusan': 'SMK Syafi\'i Akrom memiliki 3 jurusan unggulan: 1. TKJ (Teknik Komputer dan Jaringan) 2. RPL (Rekayasa Perangkat Lunak) 3. Multimedia. Mau tahu lebih detail tentang jurusan mana?',
    'tkj': 'Jurusan TKJ mempelajari: - Jaringan komputer - Server administration - Cybersecurity - Hardware maintenance. Prospek kerja: Network Administrator, IT Support, System Administrator.',
    'rpl': 'Jurusan RPL fokus pada: - Pemrograman web dan mobile - Database design - Software development. Teknologi: JavaScript, Python, PHP, React Native.',
    'multimedia': 'Jurusan Multimedia belajar: - Desain grafis - Animasi 2D/3D - Video editing - Photography - Content creation. Software: Adobe Photoshop, Illustrator, Premiere Pro.',
    'ppdb': 'Info PPDB terbaru bisa dilihat di: https://ppdb.ponpes-smksa.sch.id. Pendaftaran dibuka untuk tahun ajaran 2024/2025.',
    'kontak': 'Kontak SMK Syafi\'i Akrom: 📞 Telp: (0285) 123-4567 📧 Email: info@smksa.sch.id 🌐 Website: https://ponpes-smksa.sch.id 🏫 Alamat: Jl. Contoh No. 123, Pekalongan',
    'alamat': 'Alamat SMK Syafi\'i Akrom: Jl. Contoh No. 123, Pekalongan, Jawa Tengah. Bisa dilihat di Google Maps.',
    'ekskul': 'Ekskul yang tersedia: 1. Pramuka 2. Robotik 3. Basket 4. Marching Band 5. IT Club. Mau tahu detail ekskul tertentu?'
};
// ✅ BARU SETELAH ITU PAKAI app.use()
app.use(cors()); // ✅ SIMPLE CORS

app.use(express.json());


// ✅ Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SMK Chatbot API is running!',
        endpoints: {
            health: '/api/health',
            chat: '/api/ask',
            admin: '/api/admin/bot-stats',
            test: '/api/test-bot'
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Untuk development, tetap serve static files
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static("public"));
}

async function askGemini(question, contextStr = "") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Konfigurasi server belum lengkap (GEMINI_API_KEY).";

    const body = {
        contents: [{
            role: "user",
            parts: [{
                text: `Anda adalah asisten AI untuk website SMK Syafi'i Akrom.

Petunjuk penting:
- Jika pertanyaan berkaitan dengan SMK Syafi'i Akrom, prioritaskan jawaban berdasarkan informasi yang tersedia di https://ponpes-smksa.sch.id/.
- Jika pertanyaan tentang PPDB, cari dan rangkum informasi terbaru dari https://ppdb.ponpes-smksa.sch.id/, lalu berikan jawaban singkat dan sertakan link tersebut di akhir jawaban.
- Jika pertanyaan tentang BKK atau Bursa Kerja Khusus, cari dan rangkum informasi dari https://bkk.ponpes-smksa.sch.id/, lalu berikan jawaban singkat dan sertakan link tersebut di akhir jawaban.
- Jika pertanyaan user seputar ilmu pengetahuan umum, pendidikan, atau hal bermanfaat lainnya (misal: sains, matematika, kimia, fisika, tecnologia, motivasi, dan sebagainya), jawab sesuai pengetahuan Anda secara ringkas, jelas, dan mudah dipahami.
- Jangan membatasi jawaban hanya pada informasi sekolah saja jika pertanyaan user bersifat umum atau edukatif.
- Gunakan bullet sederhana jika perlu, tanpa bold, italic, atau link panjang.
- Jawab hanya sesuai pertanyaan user, jangan menambah informasi di luar permintaan user.
- Jika informasi seputar SMK Syafi'i Akrom tidak ditemukan, jawab: "Maaf, informasi ini belum tersedia. Silakan kunjungi website resmi SMK Syafi'i Akrom."
- Jika pertanyaan tidak relevan atau tidak jelas, jawab: "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut."

KONTEKS SEKOLAH:
${contextStr.slice(0, 4000)}

Pertanyaan: ${question}`
            }]
        }]
    };

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            body, {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data ?.candidates ?. [0] ?.content ?.parts ?. [0] ?.text) {
            return response.data.candidates[0].content.parts[0].text;
        }
        return response.data ?.error ?.message || "Gagal mendapatkan jawaban dari AI.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Maaf, sedang ada gangguan pada sistem AI. Silakan coba lagi nati.";
    }
}

// ===== Build context dari DB =====
async function buildContext() {
    try {
        const [statis, jur, eks, news] = await Promise.all([
            db.all(`SELECT key, value FROM statis`),
            db.all(`SELECT nama, deskripsi FROM jurusan`),
            db.all(`SELECT nama, pembina, deskripsi FROM ekskul`),
            db.all(`SELECT title, link, date FROM berita ORDER BY id DESC LIMIT 5`)
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
app.post("/api/ask", async (req, res) => {
    const q = (req.body ?.question || "").trim();

    if (!q) {
        return res.json({
            answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
            quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"]
        });
    }

    try {
        const botResponse = await getAnswer(q);

        if (botResponse.answer && botResponse.source !== "fallback") {
            return res.json({
                answer: botResponse.answer,
                quickReplies: botResponse.quickReplies
            });
        }

        const ctx = await buildContext();
        const geminiAnswer = await askGemini(q, ctx);

        return res.json({
            answer: geminiAnswer,
            quickReplies: ["Info jurusan", "PPDB", "Kontak sekolah", "Ekstrakurikuler", "Berita terbaru", "Fasilitas sekolah"]
        });

    } catch (e) {
        console.error("Error in /ask endpoint:", e);
        return res.json({
            answer: "Maaf, sedang terjadi gangguan teknis. Silakan coba lagi dalam beberapa saat.",
            quickReplies: []
        });
    }
});

// Juga endpoint debug
app.get("/api/debug", (req, res) => {
    res.json({
        version: "debug-test"
    });
});

// ===== Endpoint Health Check =====
app.get("/api/health", async (req, res) => {
    try {
        const health = await db.healthCheck();
        res.json({
            status: health.status,
            message: "Server is running",
            timestamp: new Date().toISOString(),
            database: health
        });
    } catch (error) {
        res.json({
            status: "error",
            message: "Database health check failed",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ===== Endpoint Bot Stats (Admin) =====
app.get("/api/admin/bot-stats", async (req, res) => {
    try {
        const {
            chatbot
        } = require("./JS/bot");
        const cacheStats = chatbot.getCacheStats();

        res.json({
            status: "success",
            cache: {
                size: cacheStats.size,
                keys: cacheStats.keys.slice(0, 10)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// ===== Endpoint Clear Cache (Admin) =====
app.post("/api/admin/clear-cache", async (req, res) => {
    try {
        const {
            chatbot
        } = require("./JS/bot");
        chatbot.clearCache();

        res.json({
            status: "success",
            message: "Cache cleared successfully"
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// // ===== Endpoint Refresh Scraping =====
// app.post("/api/refresh", async (req, res) => {
//     const token = req.headers["x-refresh-token"];
//     if (token !== process.env.REFRESH_TOKEN) {
//         return res.status(403).json({
//             ok: false,
//             message: "Forbidden"
//         });
//     }

//     try {
//         await runScraper();
//         res.json({
//             ok: true,
//             message: "Scrape selesai dan data diperbarui"
//         });
//     } catch (e) {
//         console.error("Refresh error:", e);
//         res.status(500).json({
//             ok: false,
//             message: "Gagal melakukan scraping: " + e.message
//         });
//     }
// });

app.post("/api/ask", async (req, res) => {
    const message = (req.body ?.message || "").trim().toLowerCase();

    console.log("Received message:", message); // ✅ DEBUG LOG

    // ✅ SIMPLE PATTERN MATCHING
    const patterns = {
        'jurusan': 'SMK Syafi\'i Akrom memiliki 3 jurusan unggulan: 1. TKJ (Teknik Komputer dan Jaringan) 2. RPL (Rekayasa Perangkat Lunak) 3. Multimedia. Mau tahu lebih detail tentang jurusan mana?',
        'tkj': 'Jurusan TKJ mempelajari: - Jaringan komputer - Server administration - Cybersecurity - Hardware maintenance. Prospek kerja: Network Administrator, IT Support, System Administrator.',
        'rpl': 'Jurusan RPL fokus pada: - Pemrograman web dan mobile - Database design - Software development. Teknologi: JavaScript, Python, PHP, React Native.',
        'multimedia': 'Jurusan Multimedia belajar: - Desain grafis - Animasi 2D/3D - Video editing - Photography - Content creation. Software: Adobe Photoshop, Illustrator, Premiere Pro.',
        'ppdb': 'Info PPDB terbaru bisa dilihat di: https://ppdb.ponpes-smksa.sch.id. Pendaftaran dibuka untuk tahun ajaran 2024/2025.',
        'kontak': 'Kontak SMK Syafi\'i Akrom: 📞 Telp: (0285) 123-4567 📧 Email: info@smksa.sch.id 🌐 Website: https://ponpes-smksa.sch.id 🏫 Alamat: Jl. Contoh No. 123, Pekalongan'
    };

    // ✅ CEK PATTERN
    for (const [key, response] of Object.entries(patterns)) {
        if (message.includes(key)) {
            console.log("Pattern matched:", key); // ✅ DEBUG LOG
            return res.json({
                answer: response,
                quickReplies: ["Info detail", "PPDB", "Kontak"]
            });
        }
    }

    // ✅ DEFAULT RESPONSE
    console.log("No pattern matched, returning default"); // ✅ DEBUG LOG
    return res.json({
        answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
        quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"]
    });
});

// ===== START SERVER =====
async function startServer() {
    try {
        await db.connectIfNeeded();
        console.log("✅ Database connected successfully");

        const tablesExist = await db.checkTablesExist();
        if (!tablesExist) {
            console.log("🔄 Initializing database tables...");
            await db.init();
        } else {
            console.log("✅ Database tables already exist");
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server berjalan di port ${PORT}`);
            console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
            console.log(`🤖 Chatbot endpoint: http://localhost:${PORT}/api/ask`);
            console.log(`📊 Bot stats: http://localhost:${PORT}/api/admin/bot-stats`);
            console.log(`🧪 Test bot: http://localhost:${PORT}/api/test-bot`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// Jalankan server
startServer();