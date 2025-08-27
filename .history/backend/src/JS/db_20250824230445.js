const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
// Contoh konfigurasi database
const dbConfig = {
    database: process.env.DB_PATH || './school.db',
    // konfigurasi lainnya
};
class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
        this.dbPath = this.getDatabasePath();
        this.initializing = false;
    }

    // 📌 Lokasi database ada di backend/school.db
    getDatabasePath() {
        return path.join(__dirname, "..", "school.db");
    }

    ensureDatabaseDir() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected && this.db) return resolve(this.db);

            this.ensureDatabaseDir();
            this.db = new sqlite3.Database(
                this.dbPath,
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                (err) => {
                    if (err) {
                        console.error("❌ DB connection error:", err.message);
                        return reject(err);
                    }
                    this.isConnected = true;
                    console.log("✅ Connected to SQLite:", this.dbPath);
                    resolve(this.db);
                }
            );

            this.db.on("error", (err) => {
                console.error("❌ DB runtime error:", err);
                this.isConnected = false;
            });
        });
    }

    async connectIfNeeded() {
        if (!this.isConnected) {
            await this.connect();
        }
        return this.db;
    }

    async checkTablesExist() {
        try {
            const result = await this.get(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='statis'
            `);
            return !!result;
        } catch {
            return false;
        }
    }

    async init() {
        if (this.initializing) return;
        this.initializing = true;

        try {
            await this.connectIfNeeded();

            const tablesExist = await this.checkTablesExist();
            if (tablesExist) {
                console.log("✅ Tables already exist, skipping init");
                return;
            }

            console.log("📝 Creating database tables...");
            await this.run(`PRAGMA journal_mode = WAL;`);
            await this.run(`PRAGMA foreign_keys = ON;`);
            await this.run(`PRAGMA busy_timeout = 3000;`);

            await this.run(`CREATE TABLE IF NOT EXISTS statis (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            await this.run(`CREATE TABLE IF NOT EXISTS jurusan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama TEXT UNIQUE NOT NULL,
                deskripsi TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            await this.run(`CREATE TABLE IF NOT EXISTS ekskul (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama TEXT UNIQUE NOT NULL,
                pembina TEXT,
                deskripsi TEXT,
                jadwal TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            await this.run(`CREATE TABLE IF NOT EXISTS berita (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                link TEXT UNIQUE NOT NULL,
                date TEXT,
                excerpt TEXT,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            await this.run(`CREATE TABLE IF NOT EXISTS fasilitas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama TEXT UNIQUE NOT NULL,
                deskripsi TEXT,
                lokasi TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            await this.run(`CREATE TABLE IF NOT EXISTS ppdb_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tahun_ajaran TEXT NOT NULL,
                informasi TEXT,
                persyaratan TEXT,
                jadwal TEXT,
                biaya TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`);

            console.log("✅ Tables created successfully");
            await this.insertDefaultData();
        } catch (error) {
            console.error("❌ DB init error:", error.message);
        } finally {
            this.initializing = false;
        }
    }

    async insertDefaultData() {
        try {
            const statisCount = await this.get(`SELECT COUNT(*) as count FROM statis`);
            if (statisCount.count === 0) {
                console.log("📝 Inserting default static data...");
                const defaultData = [
                    ["visi", "Tersedianya generasi muda profesional, mandiri, dan berakhlaqul karimah."],
                    ["misi", "Menyiapkan peserta didik agar siap kerja & berakhlak mulia."],
                    ["alamat", "Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah"],
                    ["telp", "(0285) 410447"],
                    ["email", "smk_sa@ymail.com"],
                    ["website", "https://ponpes-smksa.sch.id/"]
                ];
                for (const [key, value] of defaultData) {
                    try {
                        await this.setStatis(key, value);
                    } catch (err) {
                        console.error("⚠️ Failed insert default statis:", err.message);
                    }
                }
            }

            const jurusanCount = await this.get(`SELECT COUNT(*) as count FROM jurusan`);
            if (jurusanCount.count === 0) {
                console.log("📝 Inserting default jurusan data...");
                const defaultJurusan = [
                    ["Teknik Komputer dan Jaringan", "Mempelajari jaringan komputer & perakitan."],
                    ["Rekayasa Perangkat Lunak", "Fokus pada pemrograman & pengembangan aplikasi."],
                    ["Multimedia", "Desain grafis, animasi, video editing, konten digital."]
                ];
                for (const [nama, deskripsi] of defaultJurusan) {
                    try {
                        await this.run(
                            `INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES (?, ?)`,
                            [nama, deskripsi]
                        );
                    } catch (err) {
                        console.error("⚠️ Failed insert default jurusan:", err.message);
                    }
                }
            }

            const ekskulCount = await this.get(`SELECT COUNT(*) as count FROM ekskul`);
            if (ekskulCount.count === 0) {
                console.log("📝 Inserting default ekskul data...");
                const defaultEkskul = [
                    ["Pramuka", "Pak Ahmad", "Melatih kepemimpinan & kemandirian."],
                    ["Robotik", "Bu Siti", "Klub robotika & coding."],
                    ["Seni Islami", "Bu Fatimah", "Pengembangan seni islami & tilawah."]
                ];
                for (const [nama, pembina, deskripsi] of defaultEkskul) {
                    try {
                        await this.run(
                            `INSERT OR IGNORE INTO ekskul (nama, pembina, deskripsi) VALUES (?, ?, ?)`,
                            [nama, pembina, deskripsi]
                        );
                    } catch (err) {
                        console.error("⚠️ Failed insert default ekskul:", err.message);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error inserting default data:", error.message);
        }
    }

    async setStatis(key, value) {
        return this.run(
            `INSERT INTO statis (key, value) VALUES (?, ?) 
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            [key, value]
        );
    }

    async get(sql, params = []) {
        await this.connectIfNeeded();
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error("❌ DB get error:", err.message);
                    reject(err);
                } else {
                    resolve(row || {});
                }
            });
        });
    }

    async all(sql, params = []) {
        await this.connectIfNeeded();
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error("❌ DB all error:", err.message);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async run(sql, params = []) {
        await this.connectIfNeeded();
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.error("❌ DB run error:", err.message, "SQL:", sql);
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // ✅ Tambahan untuk server.js → health check
    async healthCheck() {
        try {
            await this.connectIfNeeded();
            await this.get("SELECT 1 as ok");
            return {
                status: "ok",
                db: this.dbPath
            };
        } catch (err) {
            return {
                status: "error",
                message: err.message
            };
        }
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error("❌ Error closing DB:", err.message);
                        reject(err);
                    } else {
                        this.isConnected = false;
                        console.log("✅ DB connection closed");
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

const database = new Database();
module.exports = database;
