// bot.js
const db = require("./db");

// Normalisasi & sinonim
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function applySynonyms(text) {
    const synonyms = [
        [/rekayasa perangkat lunak|rpl/g, "rpl"],
        [/teknik komputer dan jaringan|tkj/g, "tkj"],
        [/multimedia|mm/g, "mm"],
        [/ekstrakurikuler|ekskul|club|klub/g, "ekskul"],
        [/pendaftaran|daftar sekolah|ppdb/g, "ppdb"],
        [/alamat|lokasi|dimana|di mana/g, "alamat"],
        [/kontak|telepon|telp|hubungi/g, "kontak"],
        [/berita|kegiatan|agenda|event|acara/g, "berita"]
    ];
    let out = text;
    for (const [re, rep] of synonyms) out = out.replace(re, rep);
    return out;
}

class ChatBot {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 menit
    }

    // ==== PREDEFINED SIMPLE QNA ====
    static get predefinedQuestions() {
        return [{
                keywords: ["halo", "hai", "hello", "assalamualaikum", "salam"],
                answer: "Halo! 👋 Saya chatbot SMK Syafi'i Akrom. Mau tahu info apa hari ini?",
                quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"]
            },
            {
                keywords: ["terima kasih", "thanks", "makasih", "syukron"],
                answer: "Sama-sama! 😊 Senang bisa membantu.",
                quickReplies: ["Jurusan", "PPDB", "Berita sekolah"]
            },
            {
                keywords: ["kamu siapa", "siapa kamu", "nama kamu"],
                answer: "Saya adalah AI Assistant SMK Syafi'i Akrom Pekalongan. 🎓",
                quickReplies: ["Info sekolah", "Jurusan", "PPDB"]
            }
        ];
    }

    // ==== CACHE HANDLING ====
    getFromCache(question) {
        const cached = this.cache.get(question);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(question);
        return null;
    }

    setToCache(question, data) {
        this.cache.set(question, {
            data,
            timestamp: Date.now()
        });
    }

    cleanupCache() {
        const now = Date.now();
        for (const [q, d] of this.cache.entries()) {
            if (now - d.timestamp > this.cacheTimeout) this.cache.delete(q);
        }
    }

    // ==== MAIN ANSWER LOGIC ====
    async getAnswer(message, useDatabase = true) {
        const lowerMsg = normalize(message);
        const text = applySynonyms(lowerMsg);

        if (Math.random() < 0.1) this.cleanupCache();

        const cached = this.getFromCache(text);
        if (cached) return cached;

        // 1. Cek predefined QnA
        for (const q of ChatBot.predefinedQuestions) {
            if (q.keywords.some(k => text.includes(k))) {
                const response = {
                    answer: q.answer,
                    quickReplies: q.quickReplies,
                    source: "predefined"
                };
                this.setToCache(text, response);
                return response;
            }
        }

        // 2. Database Matching
        if (useDatabase) {
            try {
                // a) Jurusan detail
                if (text.includes("rpl") || text.includes("tkj") || text.includes("mm")) {
                    const code = text.includes("rpl") ? "RPL" : text.includes("tkj") ? "TKJ" : "MM";
                    const row = await db.get("SELECT nama, deskripsi FROM jurusan WHERE kode = ?", [code]);
                    if (row) {
                        const response = {
                            answer: `**${row.nama}**\n📝 ${row.deskripsi}`,
                            quickReplies: await this.getQuickReplies("jurusan"),
                            source: "database"
                        };
                        this.setToCache(text, response);
                        return response;
                    }
                }

                // b) Semua jurusan
                if (text.includes("jurusan")) {
                    const rows = await db.all("SELECT nama, deskripsi FROM jurusan");
                    if (rows.length > 0) {
                        const response = {
                            answer: this.formatJurusanResponse(rows),
                            quickReplies: await this.getQuickReplies("jurusan"),
                            source: "database"
                        };
                        this.setToCache(text, response);
                        return response;
                    }
                }

                // c) Ekstrakurikuler
                if (text.includes("ekskul")) {
                    const rows = await db.all("SELECT nama, pembina, deskripsi FROM ekskul");
                    if (rows.length > 0) {
                        const response = {
                            answer: this.formatEkskulResponse(rows),
                            quickReplies: await this.getQuickReplies("ekskul"),
                            source: "database"
                        };
                        this.setToCache(text, response);
                        return response;
                    }
                }

                // d) Kontak / alamat
                if (text.includes("kontak") || text.includes("alamat")) {
                    const rows = await db.all("SELECT key, value FROM statis WHERE key IN ('alamat','telp','email')");
                    const info = Object.fromEntries(rows.map(r => [r.key, r.value]));
                    const response = {
                        answer: this.formatKontakResponse(info),
                        quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler"],
                        source: "database"
                    };
                    this.setToCache(text, response);
                    return response;
                }

            } catch (err) {
                console.error("❌ DB Error in getAnswer:", err);
            }
        }

        // 3. Fallback
        const fallbackResponse = {
            answer: "Maaf, saya belum paham pertanyaan itu 😅. Coba tanya misalnya: *Jurusan RPL*, *Info PPDB*, atau *Ekstrakurikuler*.",
            quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
            source: "fallback"
        };
        this.setToCache(text, fallbackResponse);
        return fallbackResponse;
    }

    // ==== FORMAT RESPONSES ====
    formatJurusanResponse(list) {
        return "🎓 **JURUSAN SMK Syafi'i Akrom**\n\n" +
            list.map((j, i) => `${i+1}. **${j.nama}** — ${j.deskripsi || 'Deskripsi menyusul'}`).join("\n");
    }

    formatEkskulResponse(list) {
        return "⚽ **EKSTRAKURIKULER**\n\n" +
            list.map((e, i) => `${i+1}. **${e.nama}**${e.pembina ? ` — Pembina: ${e.pembina}` : ""}`).join("\n");
    }

    formatKontakResponse(info) {
        return `📞 **KONTAK SEKOLAH**\n\n📍 ${info.alamat || '-'}\n📞 ${info.telp || '-'}\n📧 ${info.email || '-'}`;
    }

    // ==== QUICK REPLIES ====
    async getQuickReplies(context = "general") {
        const quickReplies = {
            general: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
            jurusan: ["TKJ", "RPL", "MM", "Kembali"],
            ppdb: ["Syarat PPDB", "Biaya", "Jadwal", "Kontak PPDB"],
            ekskul: ["Pramuka", "Robotik", "Seni Islami", "Lainnya"]
        };
        try {
            if (context === "jurusan") {
                const rows = await db.all("SELECT nama FROM jurusan LIMIT 4");
                if (rows.length > 0) return rows.map(r => r.nama);
            }
            if (context === "ekskul") {
                const rows = await db.all("SELECT nama FROM ekskul LIMIT 4");
                if (rows.length > 0) return rows.map(r => r.nama);
            }
        } catch (e) {
            console.error("❌ QuickReply DB error:", e);
        }
        return quickReplies[context] || quickReplies.general;
    }

    // ==== UTIL ====
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: [...this.cache.keys()]
        };
    }
}

const chatbot = new ChatBot();
module.exports = {
    ChatBot,
    chatbot,
    getAnswer: chatbot.getAnswer.bind(chatbot)
};
