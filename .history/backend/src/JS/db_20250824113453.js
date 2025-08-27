const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

class Database {
    constructor() {
        this.db = null;
        this.isConnected = false;
        this.dbPath = this.getDatabasePath();
        this.initializing = false;
    }

    // Get database path based on environment
    getDatabasePath() {
        return path.join(__dirname, "school.db");
    }

    // Ensure database directory exists
    ensureDatabaseDir() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
    }

    // Connect to database
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                if (this.isConnected && this.db) {
                    return resolve(this.db);
                }

                this.ensureDatabaseDir();

                this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                    if (err) {
                        console.error("❌ Database connection error:", err.message);
                        reject(err);
                        return;
                    }

                    this.isConnected = true;
                    console.log("✅ Connected to SQLite database:", this.dbPath);
                    resolve(this.db);
                });

                // Handle database connection errors
                this.db.on('error', (err) => {
                    console.error('❌ Database error:', err);
                    this.isConnected = false;
                    // Try to reconnect on error
                    setTimeout(() => {
                        if (!this.isConnected) {
                            console.log('🔄 Attempting to reconnect to database...');
                            this.connect().catch(console.error);
                        }
                    }, 5000);
                });

            } catch (error) {
                console.error("❌ Failed to connect to database:", error);
                reject(error);
            }
        });
    }

    // Check if tables exist
    async checkTablesExist() {
        try {
            const result = await this.get(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='statis'
            `);
            return !!result;
        } catch (error) {
            return false;
        }
    }

    // Initialize database tables
    async init() {
        if (this.initializing) return;
        this.initializing = true;

        try {
            await this.connect();

            // Check if tables already exist
            const tablesExist = await this.checkTablesExist();
            if (tablesExist) {
                console.log("✅ Database tables already exist, skipping creation");
                this.initializing = false;
                return;
            }

            console.log("📝 Creating database tables...");

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

            if (error.message.includes('database is corrupted') || error.message.includes('not a database')) {
                console.log("🔄 Attempting to recreate corrupted database...");
                await this.recreateDatabase();
            }
        } finally {
            this.initializing = false;
        }
    }

    // Recreate database if corrupted
    async recreateDatabase() {
        try {
            // Close existing connection
            if (this.db) {
                await this.close();
            }

            // Backup corrupted database
            if (fs.existsSync(this.dbPath)) {
                const backupPath = this.dbPath + '.corrupted.' + Date.now() + '.bak';
                fs.renameSync(this.dbPath, backupPath);
                console.log("📦 Backup of corrupted database created:", backupPath);
            }

            // Create new database
            this.db = new sqlite3.Database(this.dbPath);
            await this.init();
            console.log("✅ Database recreated successfully");

        } catch (error) {
            console.error("❌ Failed to recreate database:", error);
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
                    ['misi', '1. Menyiapkan peserta didik agar menjadi manusia produktif, mampu bekerja mandiri, mengisi lowongan pekerjaan yang ada di dunia usaha dan dunia industri sebagai tenaga kerja tingkat menengah sesuai dengan kompetensi dalam program keahlian masing-masing.\n2.Menyiapkan peserta didik agar mampu memilih karier, ulet dan gigih dalam berkompetisi, beradaptasi di lingkungan kerja, dan mengembangkan sikap professional dalam bidang keahliannya, beraqidah ahlussunnah wal jamaah, dan berakhlaqul karimah\n3. Membekali peserta didik dengan Ilmu Pengetahuan, teknologi, dan seni agar mampu mengembangkan diri di kemudian hari baik secara mandiri maupun melalui jenjang pendidikan yang lebih tinggi.\n4. Membina dan menyiapkan guru/ karyawan yang profesional dan berjiwa pendidik.'],
                    ['alamat', 'Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah'],
                    ['telp', '(0285) 410447'],
                    ['email', 'smk_sa@ymail.com'],
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
            if (!this.db || !this.isConnected) {
                return reject(new Error("Database not connected. Call connect() first."));
            }

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
            if (!this.db || !this.isConnected) {
                return reject(new Error("Database not connected. Call connect() first."));
            }

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
            if (!this.db || !this.isConnected) {
                return reject(new Error("Database not connected. Call connect() first."));
            }

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
            if (!this.isConnected) {
                await this.connect();
            }

            const result = await this.get("SELECT 1 as status");
            return {
                status: 'healthy',
                connected: this.isConnected,
                database_path: this.dbPath,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: this.isConnected,
                database_path: this.dbPath,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Connect if needed
    async connectIfNeeded() {
        if (!this.isConnected) {
            await this.connect();
        }
        return this.db;
    }
}

// Create singleton instance
const database = new Database();

// Jangan auto-init, biarkan server.js yang handle
// database.init().catch(console.error);

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