const db = require('./db');

async function seedDatabase() {
    try {
        console.log('🔄 Seeding database with manual data...');

        // 1. DATA STATIS
        await db.run(`INSERT OR REPLACE INTO statis (key, value) VALUES 
            ('visi', 'Menjadi SMK unggulan yang menghasilkan lulusan kompeten dan berakhlak mulia'),
            ('misi', '1. Menyelenggarakan pendidikan berkualitas 2. Mengembangkan potensi siswa 3. Kerjasama dengan industri'),
            ('alamat', 'Jl. Contoh No. 123, Pekalongan, Jawa Tengah'),
            ('telp', '(0285) 123-4567'),
            ('email', 'info@smksa.sch.id'),
            ('website', 'https://ponpes-smksa.sch.id')
        `);

        // 2. DATA JURUSAN
        await db.run(`INSERT OR REPLACE INTO jurusan (nama, deskripsi) VALUES 
            ('Teknik Komputer dan Jaringan (TKJ)', 'Mempelajari jaringan komputer, server administration, cybersecurity, dan maintenance hardware. Lulusan siap kerja sebagai network administrator atau technical support.'),
            ('Rekayasa Perangkat Lunak (RPL)', 'Fokus pada pemrograman web dan mobile, database design, software development. Menggunakan teknologi terbaru seperti JavaScript, Python, dan PHP.'),
            ('Multimedia (MM)', 'Belajar desain grafis, animasi, video editing, photography, dan content creation. Cocok untuk yang kreatif dan suka dunia digital media.')
        `);

        // 3. DATA EKSKUL
        await db.run(`INSERT OR REPLACE INTO ekskul (nama, pembina, deskripsi) VALUES 
            ('Pramuka', 'Bpk. Ahmad', 'Membangun karakter disiplin dan kepemimpinan'),
            ('ROBOTIK', 'Bpk. Budi', 'Belajar merakit dan memprogram robot'),
            ('Basket', 'Bpk. Catur', 'Latihan basket setiap Jumat sore'),
            ('Marching Band', 'Ibu. Dian', 'Tampil di event sekolah dan kota'),
            ('IT Club', 'Bpk. Eko', 'Ekskul untuk pengembangan skill IT')
        `);

        // 4. DATA BERITA/CONTENT
        await db.run(`INSERT OR REPLACE INTO berita (title, link, content) VALUES 
            ('PPDB 2024/2025 Dibuka', 'https://ppdb.ponpes-smksa.sch.id', 'Pendaftaran Peserta Didik Baru tahun ajaran 2024/2025 sudah dibuka. Daftar sekarang!'),
            ('Jurusan TKJ Meraih Sertifikasi', 'https://ponpes-smksa.sch.id/berita/tkj-sertifikasi', 'Jurusan TKJ mendapatkan sertifikasi internasional di bidang networking'),
            ('Workshop Programming', 'https://ponpes-smksa.sch.id/berita/workshop', 'Workshop pemrograman untuk siswa RPL dengan industry expert')
        `);

        console.log('✅ Database seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
}

// Jalankan jika file ini di-run langsung
if (require.main === module) {
    seedDatabase();
}

module.exports = {
    seedDatabase
};