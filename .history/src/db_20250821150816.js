// db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    // Connect to database
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                const dbPath = path.join(__dirname, "school.db");
                this.db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        console.error("❌ Database connection error:", err.message);
                        reject(err);
                        return;
                    }

                    this.isConnected = true;
                    console.log("✅ Connected to SQLite database:", dbPath);
                    resolve(this.db);
                });

                // Handle database connection errors
                this.db.on('error', (err) => {
                    console.error('❌ Database error:', err);
                    this.isConnected = false;
                });

            } catch (error) {
                console.error("❌ Failed to connect to database:", error);
                reject(error);
            }
        });
    }

    // Initialize database tables
    async init() {
        try {
            await this.connect();

            await this.run(`PRAGMA journal_mode = WAL;`);
            await this.run(`PRAGMA foreign_keys = ON;`);
            await this.run(`PRAGMA busy_timeout = 3000;`);

            // Create tables if they don't exist
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

            console.log("✅ Database tables initialized successfully");

            // Insert default data if tables are empty
            await this.insertDefaultData();

        } catch (error) {
            console.error("❌ Database initialization error:", error);
            throw error;
        }
    }

    // Insert default data
    async insertDefaultData() {
        try {
            // Check if statis table is empty
            const statisCount = await this.get(`SELECT COUNT(*) as count FROM statis`);
            if (statisCount.count === 0) {
                console.log("📝 Inserting default static data...");

                const defaultData = [
                    ['visi', 'Tersedianya generasi muda yang profesional, mandiri dan berakhlaqul karimah, serta mendapat ridha Allah SWT, melalui perpaduan Iman Taqwa dan IPTEK.'],
                    ['misi', '1. Menyelenggarakan pendidikan berkualitas\n2. Mengembangkan kompetensi kejuruan\n3. Membentuk karakter islami\n4. Kerjasama dengan industri'],
                    ['alamat', ''],
                    ['telp', '(0285) 1234567'],
                    ['email', 'info@smksa.sch.id'],
                    ['website', 'https://ponpes-smksa.sch.id/']
                ];

                for (const [key, value] of defaultData) {
                    await this.setStatis(key, value);
                }
            }

            // Check if jurusan table is empty
            const jurusanCount = await this.get(`SELECT COUNT(*) as count FROM jurusan`);
            if (jurusanCount.count === 0) {
                console.log("📝 Inserting default jurusan data...");

                const defaultJurusan = [
                    ['Teknik Komputer dan Jaringan', 'Mempelajari perakitan, instalasi, perbaikan, dan perawatan komputer serta jaringan'],
                    ['Rekayasa Perangkat Lunak', 'Fokus pada pemrograman, pengembangan software, dan aplikasi mobile'],
                    ['Multimedia', 'Mempelajari desain grafis, animasi, video editing, dan produksi konten digital']
                ];

                for (const [nama, deskripsi] of defaultJurusan) {
                    await this.run(
                        `INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES (?, ?)`,
                        [nama, deskripsi]
                    );
                }
            }

            // Check if ekskul table is empty
            const ekskulCount = await this.get(`SELECT COUNT(*) as count FROM ekskul`);
            if (ekskulCount.count === 0) {
                console.log("📝 Inserting default ekskul data...");

                const defaultEkskul = [
                    ['Pramuka', 'Pak Ahmad', 'Kegiatan kepanduan untuk melatih leadership'],
                    ['Robotik', 'Bu Siti', 'Klub robotika dan programming'],
                    ['Seni Islami', 'Bu Fatima', 'Pengembangan baca seni islami']
                ];

                for (const [nama, pembina, deskripsi] of defaultEkskul) {
                    await this.run(
                        `INSERT OR IGNORE INTO ekskul (nama, pembina, deskripsi) VALUES (?, ?, ?)`,
                        [nama, pembina, deskripsi]
                    );
                }
            }

        } catch (error) {
            console.error("❌ Error inserting default data:", error);
        }
    }

    // Set static data
    async setStatis(key, value) {
        try {
            const result = await this.run(
                `INSERT INTO statis (key, value) VALUES (?, ?) 
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
                [key, value]
            );
            return result;
        } catch (error) {
            console.error("❌ Error setting static data:", error);
            throw error;
        }
    }

    // Get single row
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error("❌ Database get error:", err);
                    reject(err);
                } else {
                    resolve(row || {});
                }
            });
        });
    }

    // Get all rows
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error("❌ Database all error:", err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Run SQL command
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.error("❌ Database run error:", err);
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes,
                        sql: sql
                    });
                }
            });
        });
    }

    // Close database connection
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error("❌ Error closing database:", err);
                        reject(err);
                    } else {
                        this.isConnected = false;
                        console.log("✅ Database connection closed");
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Health check
    async healthCheck() {
        try {
            const result = await this.get("SELECT 1 as status");
            return {
                status: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Backup database (optional)
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            const backupDb = new sqlite3.Database(backupPath);
            this.db.backup(backupDb, (err) => {
                if (err) {
                    console.error("❌ Database backup error:", err);
                    reject(err);
                } else {
                    console.log("✅ Database backup completed:", backupPath);
                    backupDb.close();
                    resolve();
                }
            });
        });
    }
}

// Create singleton instance
const database = new Database();

// Initialize database when imported
database.init().catch(console.error);

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down database connection...');
    await database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down database connection...');
    await database.close();
    process.exit(0);
});

module.exports = database;