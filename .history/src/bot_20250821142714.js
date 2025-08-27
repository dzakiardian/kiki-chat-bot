// bot.js
const db = require("./db"); // ✅ Import database yang baru

class ChatBot {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 menit cache
    }

    // Predefined questions untuk fallback
    static get predefinedQuestions() {
        return [{
                keywords: ["halo", "hai", "hello", "hi", "selamat", "selamat datang", "hallo", "assalamualaikum", "assalamu'alaikum", "salam", "salam sejahtera","halo bro", "halo sis"],
                answer: "Halo! 👋 Saya adalah chatbot SMK Syafi'i Akrom. Ada yang bisa saya bantu hari ini?",
                quickReplies: ["Info jurusan", "PPDB", "Kontak sekolah"]
            },
            {
                keywords: ["terima kasih", "thanks", "makasih", "thank you", "thx", "syukron", "syukron jazakumullah"],
                answer: "Sama-sama! 😊 Senang bisa membantu. Jika ada pertanyaan lain, saya siap membantu!",
                quickReplies: ["Info jurusan", "PPDB", "Ekstrakurikuler"]
            },
            {
                keywords: ["siapa kamu", "nama kamu", "kamu siapa","lu itu siapa"],
                answer: "Saya adalah AI Assistant SMK Syafi'i Akrom Pekalongan. Saya siap membantu Anda dengan informasi seputar sekolah kami! 🎓",
                quickReplies: ["Info sekolah", "Jurusan", "PPDB"]
            },
            {
                keywords: ["help", "bantuan", "tolong", "menu",],
                answer: "Saya bisa membantu Anda dengan:\n\n• 🎓 Informasi jurusan\n• 📝 PPDB dan pendaftaran\n• ⚽ Ekstrakurikuler\n• 🏫 Fasilitas sekolah\n• 📰 Berita terbaru\n• 📞 Kontak sekolah\n\nApa yang ingin Anda ketahui?",
                quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak"]
            }
        ];
    }

    // Cek cache untuk pertanyaan yang sama
    getFromCache(question) {
        const cached = this.cache.get(question);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(question);
        return null;
    }

    // Simpan ke cache
    setToCache(question, data) {
        this.cache.set(question, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Bersihkan cache expired
    cleanupCache() {
        const now = Date.now();
        for (const [question, data] of this.cache.entries()) {
            if (now - data.timestamp > this.cacheTimeout) {
                this.cache.delete(question);
            }
        }
    }

    // Get answer dengan improved logic
    async getAnswer(message, useDatabase = true) {
        const lowerMsg = message.toLowerCase().trim();

        // Bersihkan cache secara periodic
        if (Math.random() < 0.1) this.cleanupCache();

        // Cek cache dulu
        const cached = this.getFromCache(lowerMsg);
        if (cached) {
            console.log("📦 Menggunakan cached response");
            return cached;
        }

        // Cek predefined questions
        for (const q of ChatBot.predefinedQuestions) {
            if (q.keywords.some(keyword => lowerMsg.includes(keyword))) {
                const response = {
                    answer: q.answer,
                    quickReplies: q.quickReplies,
                    source: "predefined"
                };
                this.setToCache(lowerMsg, response);
                return response;
            }
        }

        // Jika menggunakan database, cari jawaban yang lebih spesifik
        if (useDatabase) {
            try {
                // Cek pertanyaan tentang jurusan
                if (lowerMsg.includes("jurusan")) {
                    const rows = await db.all("SELECT nama, deskripsi FROM jurusan");
                    if (rows.length > 0) {
                        const response = {
                            answer: this.formatJurusanResponse(rows),
                            quickReplies: rows.map(r => `Detail ${r.nama}`).slice(0, 3),
                            source: "database"
                        };
                        this.setToCache(lowerMsg, response);
                        return response;
                    }
                }

                // Cek pertanyaan tentang ekstrakurikuler
                if (lowerMsg.includes("ekskul") || lowerMsg.includes("ekstrakurikuler")) {
                    const rows = await db.all("SELECT nama, pembina, deskripsi FROM ekskul");
                    if (rows.length > 0) {
                        const response = {
                            answer: this.formatEkskulResponse(rows),
                            quickReplies: rows.map(r => `Info ${r.nama}`).slice(0, 3),
                            source: "database"
                        };
                        this.setToCache(lowerMsg, response);
                        return response;
                    }
                }

                // Cek pertanyaan tentang kontak
                if (lowerMsg.includes("kontak") || lowerMsg.includes("alamat") || lowerMsg.includes("telp")) {
                    const rows = await db.all("SELECT key, value FROM statis WHERE key IN ('alamat', 'telp', 'email')");
                    const info = Object.fromEntries(rows.map(r => [r.key, r.value]));

                    const response = {
                        answer: this.formatKontakResponse(info),
                        quickReplies: ["Info jurusan", "PPDB", "Ekstrakurikuler"],
                        source: "database"
                    };
                    this.setToCache(lowerMsg, response);
                    return response;
                }

            } catch (error) {
                console.error("❌ Database error in getAnswer:", error);
                // Fallback ke response default jika database error
            }
        }

        // Fallback response
        const fallbackResponse = {
            answer: "Maaf, saya belum memahami pertanyaan Anda. 😅\n\nCoba tanyakan tentang:\n• 🎓 Informasi jurusan\n• 📝 PPDB dan pendaftaran\n• ⚽ Ekstrakurikuler\n• 🏫 Fasilitas sekolah\n• 📰 Berita terbaru\n• 📞 Kontak sekolah",
            quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak"],
            source: "fallback"
        };

        this.setToCache(lowerMsg, fallbackResponse);
        return fallbackResponse;
    }

    // Format response untuk jurusan
    formatJurusanResponse(jurusanList) {
        if (jurusanList.length === 0) {
            return "📚 Informasi jurusan belum tersedia. Silakan coba lagi nanti.";
        }

        let response = "🎓 **JURUSAN SMK SYAFI'I AKROM**\n\n";

        jurusanList.forEach((jurusan, index) => {
            response += `**${index + 1}. ${jurusan.nama}**\n`;
            response += `   📝 ${jurusan.deskripsi || 'Deskripsi sedang diperbarui'}\n\n`;
        });

        response += "🔗 **Info lengkap:** https://ponpes-smksa.sch.id/jurusan/";
        return response;
    }

    // Format response untuk ekstrakurikuler
    formatEkskulResponse(ekskulList) {
        if (ekskulList.length === 0) {
            return "⚽ Informasi ekstrakurikuler belum tersedia. Silakan coba lagi nanti.";
        }

        let response = "⚽ **EKSTRAKURIKULER**\n\n";

        ekskulList.forEach((ekskul, index) => {
            response += `**${index + 1}. ${ekskul.nama}**\n`;
            if (ekskul.pembina) response += `   👨‍🏫 Pembina: ${ekskul.pembina}\n`;
            if (ekskul.deskripsi) response += `   📋 ${ekskul.deskripsi}\n`;
            response += "\n";
        });

        return response;
    }

    // Format response untuk kontak
    formatKontakResponse(kontakInfo) {
        let response = "📞 **KONTAK SEKOLAH**\n\n";
        response += `📍 **Alamat:** ${kontakInfo.alamat || 'Jl. Raya Pekalongan'}\n`;
        response += `📞 **Telepon:** ${kontakInfo.telp || '(0285) 1234567'}\n`;
        response += `📧 **Email:** ${kontakInfo.email || 'info@smksa.sch.id'}\n\n`;
        response += "🌐 **Website:** https://ponpes-smksa.sch.id/";

        return response;
    }

    // Get quick replies berdasarkan context
    async getQuickReplies(context = "general") {
        const quickReplies = {
            general: ["Info jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
            jurusan: ["Teknik Komputer", "Rekayasa Perangkat Lunak", "Multimedia", "Kembali ke menu"],
            ppdb: ["Syarat pendaftaran", "Biaya pendidikan", "Jadwal PPDB", "Kontak panitia"],
            ekskul: ["Pramuka", "Robotik", "Seni Islami", "Daftar ekskul"]
        };

        try {
            // Jika context adalah jurusan, ambil dari database
            if (context === "jurusan") {
                const rows = await db.all("SELECT nama FROM jurusan LIMIT 4");
                if (rows.length > 0) {
                    return rows.map(r => r.nama);
                }
            }

            // Jika context adalah ekskul, ambil dari database
            if (context === "ekskul") {
                const rows = await db.all("SELECT nama FROM ekskul LIMIT 4");
                if (rows.length > 0) {
                    return rows.map(r => r.nama);
                }
            }

        } catch (error) {
            console.error("❌ Error getting quick replies from database:", error);
        }

        return quickReplies[context] || quickReplies.general;
    }

    // Reset cache
    clearCache() {
        this.cache.clear();
        console.log("✅ Cache cleared");
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Buat instance singleton
const chatbot = new ChatBot();

// Export both class and instance
module.exports = {
    ChatBot,
    chatbot,
    getAnswer: chatbot.getAnswer.bind(chatbot)
};