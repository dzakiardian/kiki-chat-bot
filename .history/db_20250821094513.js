// db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(path.join(__dirname, "school.db"));

function init() {
    db.serialize(() => {
        db.run(`PRAGMA journal_mode=WAL;`);F
        db.run(`CREATE TABLE IF NOT EXISTS statis (
      key TEXT PRIMARY KEY,
      value TEXT
    );`); // simpan: visi, misi, alamat, telp, email

        db.run(`CREATE TABLE IF NOT EXISTS jurusan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT UNIQUE,
      deskripsi TEXT
    );`);

        db.run(`CREATE TABLE IF NOT EXISTS ekskul (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT UNIQUE,
      pembina TEXT,
      deskripsi TEXT
    );`);

        db.run(`CREATE TABLE IF NOT EXISTS berita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      link TEXT UNIQUE,
      date TEXT,
      excerpt TEXT
    );`);
    });
}

function setStatis(key, value) {
    return run(`INSERT INTO statis(key,value) VALUES(?,?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [key, value]);
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = {
    db,
    init,
    setStatis,
    run,
    all
};