// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require('path');
const db = require("./JS/db"); // ✅ DIPERBAIKI: dari ../db menjadi ./db
const {
    main: runScraper
} = require("./scraper"); // ✅ DIPERBAIKI: dari ../scraper menjadi ./scraper
const {
    getAnswer
} = require("./JS/bot");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.static("public"));

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
- Jika pertanyaan user seputar ilmu pengetahuan umum, pendidikan, atau hal bermanfaat lainnya (misal: sains, matematika, kimia, fisika, teknologi, motivasi, dan sebagainya), jawab sesuai pengetahuan Anda secara ringkas, jelas, dan mudah dipahami.
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
        return "Maaf, sedang ada gangguan pada sistem AI. Silakan coba lagi nanti.";
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
app.post("/ask", async (req, res) => {
    const q = (req.body ?.question || "").trim();

    if (!q) {
        return res.json({
            answer: "Masukkan pertanyaan yang ingin Anda tanyakan.",
            quickReplies: ["Info jurusan", "Info PPDB", "Ekstrakurikuler", "Kontak sekolah"]
        });
    }

    try {
        // ✅ GUNAKAN BOT.JS UNTUK MENDAPATKAN JAWABAN
        const botResponse = await getAnswer(q);

        // Jika bot mengembalikan answer, langsung gunakan
        if (botResponse.answer && botResponse.source !== "fallback") {
            return res.json({
                answer: botResponse.answer,
                quickReplies: botResponse.quickReplies
            });
        }

        // Jika bot tidak menemukan jawaban (fallback), gunakan Gemini AI
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

// ===== Endpoint Health Check =====
app.get("/health", async (req, res) => {
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
app.get("/admin/bot-stats", async (req, res) => {
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
app.post("/admin/clear-cache", async (req, res) => {
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

// ===== Endpoint Test Bot (Development) =====
app.post("/test-bot", async (req, res) => {
    const {
        question
    } = req.body;

    if (!question) {
        return res.status(400).json({
            error: "Question parameter required"
        });
    }

    try {
        const response = await getAnswer(question);
        res.json({
            question: question,
            response: response
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Chatbot endpoint: http://localhost:${PORT}/ask`);
    console.log(`📊 Bot stats: http://localhost:${PORT}/admin/bot-stats`);
    console.log(`🧪 Test bot: http://localhost:${PORT}/test-bot`);
});