console.log("🔍 Environment Variables Check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log("All env vars:", Object.keys(process.env).filter(key => key.includes('GEM') || key.includes('API')));
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./JS/db");
const {
    getAnswer
} = require("./JS/bot");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Simple CORS
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        message: "SMK Chatbot API is running!",
        endpoints: {
            health: "/api/health",
            chat: "/api/ask",
            admin: "/api/admin/bot-stats",
            test: "/api/test-bot",
        },
        environment: process.env.NODE_ENV || "development",
    });
});

// Serve static (dev only)
if (process.env.NODE_ENV !== "production") {
    app.use(express.static("public"));
}

// ===== Manual Pattern Matching =====
const patterns = {
    jurusan: "SMK Syafi'i Akrom memiliki 3 jurusan unggulan: 1. TKJ 2. RPL 3. Multimedia",
    tkj: "Jurusan TKJ: Jaringan komputer, server, cybersecurity",
    rpl: "Jurusan RPL: Pemrograman web dan mobile app",
    multimedia: "Jurusan Multimedia: desain grafis, animasi, video editing",
    ppdb: "Info PPDB terbaru bisa dilihat di: https://ppdb.ponpes-smksa.sch.id",
    kontak: "Kontak: Telp (0285) 123-4567, Email info@smksa.sch.id",
    alamat: "Alamat SMK Syafi'i Akrom: Jl. Contoh No. 123, Pekalongan, Jawa Tengah.",
    ekskul: "Ekskul: Pramuka, Robotik, Basket, Marching Band, IT Club",
};

// ===== Gemini API =====
async function askGemini(question, contextStr = "") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        return "Konfigurasi server belum lengkap (GEMINI_API_KEY).";

    const body = {
        contents: [{
            role: "user",
            parts: [{
                text: `Anda adalah asisten AI untuk website SMK Syafi'i Akrom.
Petunjuk penting:
- Jika pertanyaan berkaitan dengan SMK Syafi'i Akrom, prioritaskan jawaban berdasarkan informasi resmi.
- Jika pertanyaan tentang PPDB, sertakan link resmi: https://ppdb.ponpes-smksa.sch.id/
- Jika pertanyaan umum, jawab singkat, jelas, mudah dipahami.
- Jika informasi sekolah tidak ditemukan, jawab: "Maaf, informasi ini belum tersedia. Silakan kunjungi website resmi SMK Syafi'i Akrom."

KONTEKS SEKOLAH: ${contextStr.slice(0, 4000)}
Pertanyaan: ${question}`,
            }, ],
        }, ],
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

        return (
            response.data ? .candidates ? . [0] ?.content ?.parts ?. [0] ?.text ||
            "Gagal mendapatkan jawaban dari AI."
        );
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        return "Maaf, sedang ada gangguan pada sistem AI.";
    }
}

async function buildContext() {
    try {
        // ✅ NON-AKTIFKAN SEMUA QUERY DATABASE UNTUK SEMENTARA
        console.log("⚠️  Database queries temporarily disabled");

        /*
        // ❌ COMMENT SEMUA BAGIAN INI:
        const [staticData, jurusanData, ekskulData, beritaData, fasilitasData, ppdbData] = await Promise.all([
            db.all("SELECT key, value FROM statis").catch(() => []),
            db.all("SELECT nama, deskripsi FROM jurusan").catch(() => []),
            db.all("SELECT nama, pembina, deskripsi, jadwal FROM ekskul").catch(() => []),
            db.all("SELECT title, link, date, excerpt FROM berita ORDER BY created_at DESC LIMIT 5").catch(() => []),
            db.all("SELECT nama, deskripsi, lokasi FROM fasilitas").catch(() => []),
            db.all("SELECT tahun_ajaran, informasi, persyaratan, jadwal, biaya FROM ppdb_info ORDER BY created_at DESC LIMIT 1").catch(() => [])
        ]);
        */

        // ✅ RETURN DATA KOSONG ATAU DEFAULT
        return {
            staticData: [],
            jurusanData: [],
            ekskulData: [],
            beritaData: [],
            fasilitasData: [],
            ppdbData: []
        };

    } catch (error) {
        console.error("Error building context:", error);
        return {};
    }
}

// // ===== Build Context dari DB =====
// async function buildContext() {
//     try {
//         const [statis, jur, eks, news] = await Promise.all([
//             db.all("SELECT key, value FROM statis"),
//             db.all("SELECT nama, deskripsi FROM jurusan"),
//             db.all("SELECT nama, pembina, deskripsi FROM ekskul"),
//             db.all("SELECT title, link, date FROM berita ORDER BY id DESC LIMIT 5"),
//         ]);

//         const map = Object.fromEntries(statis.map((s) => [s.key, s.value]));
//         const jurusanStr =
//             jur.map((j) => `• ${j.nama}: ${j.deskripsi || "Tidak ada deskripsi"}`).join("\n") || "-";
//         const ekskulStr =
//             eks.map((e) => `• ${e.nama}${e.pembina ? ` (Pembina: ${e.pembina})` : ""}`).join("\n") || "-";
//         const newsStr =
//             news.map((n) => `• ${n.title} (${n.date || "-"}) -> ${n.link}`).join("\n") || "-";

//         return `
// SMK SYAFI'I AKROM PEKALONGAN
// VISI: ${map.visi || "Belum tersedia"}
// MISI: ${map.misi || "Belum tersedia"}
// ALAMAT: ${map.alamat || "Belum tersedia"}
// TELEPON: ${map.telp || "Belum tersedia"}
// EMAIL: ${map.email || "Belum tersedia"}
// JURUSAN:
// ${jurusanStr}
// EKSTRAKURIKULER:
// ${ekskulStr}
// BERITA TERBARU:
// ${newsStr}
// Website: ${process.env.BASE_URL || "https://ponpes-smksa.sch.id/"}
//     `.trim();
//     } catch (error) {
//         console.error("Error building context:", error);
//         return "Data sekolah belum tersedia.";
//     }
// }

// ===== Endpoint Tanya =====
// app.post("/api/ask", async (req, res) => {
//     const q = (req.body ?.question || req.body ?.message || "").trim().toLowerCase();
//     if (!q) {
//         return res.json({
//             answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
//             quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"],
//         });
//     }

//     // 1️⃣ Cek Pattern Matching
//     for (const [key, response] of Object.entries(patterns)) {
//         if (q.includes(key)) {
//             console.log("✅ Pattern matched:", key);
//             return res.json({
//                 answer: response,
//                 quickReplies: []
//             });
//         }
//     }

//     try {
//         // 2️⃣ Coba pakai bot.js
//         const botResponse = await getAnswer(q);
//         if (botResponse.answer && botResponse.source !== "fallback") {
//             return res.json({
//                 answer: botResponse.answer,
//                 quickReplies: botResponse.quickReplies,
//             });
//         }

//         // 3️⃣ Fallback ke Gemini
//         const ctx = await buildContext();
//         const geminiAnswer = await askGemini(q, ctx);

//         return res.json({
//             answer: geminiAnswer,
//             quickReplies: ["Info jurusan", "PPDB", "Kontak sekolah", "Ekstrakurikuler", "Berita terbaru"],
//         });
//     } catch (e) {
//         console.error("Error in /ask endpoint:", e);
//         return res.json({
//             answer: "Maaf, sedang terjadi gangguan teknis. Silakan coba lagi.",
//             quickReplies: [],
//         });
//     }
// });

// // ===== Endpoint Tanya =====
// app.post("/api/ask", async (req, res) => {
//     const q = (req.body ?.question || req.body ?.message || "").trim();
//     if (!q) {
//         return res.json({
//             answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
//             quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"],
//         });
//     }

//     try {
//         // 🔹 Ambil data sekolah sebagai konteks
//         const ctx = await buildContext();

//         // 🔹 Minta jawaban dari Gemini
//         const geminiAnswer = await askGemini(q, ctx);

//         return res.json({
//             answer: geminiAnswer,
//             quickReplies: ["Info jurusan", "PPDB", "Kontak sekolah", "Ekstrakurikuler", "Berita terbaru"],
//         });
//     } catch (e) {
//         console.error("Error in /ask endpoint:", e);
//         return res.json({
//             answer: "Maaf, sedang terjadi gangguan teknis. Silakan coba lagi.",
//             quickReplies: [],
//         });
//     }
// });

// // ===== Endpoint Tanya =====
// app.post("/api/ask", async (req, res) => {
//     const q = (req.body ?.question || "").trim();

//     if (!q) {
//         return res.json({
//             answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
//             quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"]
//         });
//     }

//     try {
//         // ✅ LANGSUNG GUNAKAN GEMINI AI TANPA BOT LOGIC
//         const ctx = await buildContext();
//         const geminiAnswer = await askGemini(q, ctx);

//         return res.json({
//             answer: geminiAnswer,
//             quickReplies: ["Info jurusan", "PPDB", "Kontak sekolah", "Ekstrakurikuler", "Berita terbaru", "Fasilitas sekolah"]
//         });

//     } catch (e) {
//         console.error("Error in /ask endpoint:", e);
//         return res.json({
//             answer: "Maaf, sedang terjadi gangguan teknis. Silakan coba lagi dalam beberapa saat.",
//             quickReplies: []
//         });
//     }
// });
app.post("/api/ask", async (req, res) => {
    const q = (req.body ?.question || "").trim();

    if (!q) {
        return res.json({
            answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
            quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"]
        });
    }

    try {
        // ✅ HANDLE QUICK REPLIES SPECIFICALLY
        const quickReplyMap = {
            "informasi ppdb": "Bisa Anda jelaskan informasi PPDB terbaru untuk SMK Syafi'i Akrom?",
            "info jurusan": "Apa saja jurusan yang tersedia di SMK Syafi'i Akrom?",
            "informasi fasilitas": "Apa saja fasilitas yang ada di SMK Syafi'i Akrom?",
            "ppdb": "Bisa Anda jelaskan informasi PPDB terbaru untuk SMK Syafi'i Akrom?",
            "jurusan": "Apa saja jurusan yang tersedia di SMK Syafi'i Akrom?",
            "fasilitas": "Apa saja fasilitas yang ada di SMK Syafi'i Akrom?"
        };

        const processedQuestion = q.toLowerCase();
        const finalQuestion = quickReplyMap[processedQuestion] || q;

        // LANGSUNG GUNAKAN GEMINI AI
        const ctx = await buildContext();
        const geminiAnswer = await askGemini(finalQuestion, ctx);

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
// ===== Health Check =====
app.get("/api/health", async (req, res) => {
    try {
        const health = await db.healthCheck();
        res.json({
            status: health.status,
            message: "Server is running",
            timestamp: new Date().toISOString(),
            database: health,
        });
    } catch (error) {
        res.json({
            status: "error",
            message: "Database health check failed",
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// ===== Start Server =====
async function startServer() {
    console.log("Environment Variables:");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("DB_PATH:", process.env.DB_PATH);
    // Tambahkan logging untuk variabel lainnya jika perlu

    try {
        await db.connectIfNeeded();
        console.log("✅ Database connected successfully");

        // ✅ FORCE INIT DATABASE IN PRODUCTION
        if (process.env.NODE_ENV === 'production') {
            console.log("🔄 Force initializing database tables for production...");
            await db.init();
        } else {
            // development mode
            const tablesExist = await db.checkTablesExist();
            if (!tablesExist) {
                console.log("🔄 Initializing database tables...");
                await db.init();
            } else {
                console.log("✅ Database tables already exist");
            }
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server berjalan di port ${PORT}`);
            console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
            console.log(`🤖 Chatbot endpoint: http://localhost:${PORT}/api/ask`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

startServer();