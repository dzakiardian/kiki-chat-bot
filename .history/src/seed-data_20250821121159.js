// seed-data.js
const {
    setStatis,
    run
} = require("./src/db");

async function seedData() {
    // Data statis
    await setStatis("visi", "Menjadi SMK unggulan yang menghasilkan lulusan kompeten dan berakhlak mulia");
    await setStatis("misi", "1. Menyelenggarakan pendidikan berkualitas\n2. Mengembangkan kompetensi kejuruan\n3. Membentuk karakter islami\n4. Kerjasama dengan industri");
    await setStatis("alamat", "Jl. Raya Pekalongan No. 123, Kota Pekalongan");
    await setStatis("telp", "(0285) 1234567");
    await setStatis("email", "info@smksa.sch.id");

    // Data jurusan
    await run(`INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES 
        ('Teknik Komputer dan Jaringan', 'Jurusan yang mempelajari jaringan komputer dan maintenance'),
        ('Rekayasa Perangkat Lunak', 'Jurusan yang fokus pada pemrograman dan pengembangan software'),
        ('Multimedia', 'Jurusan yang mempelajari desain grafis, animasi, dan produksi media')`);

    // Data ekskul
    await run(`INSERT OR IGNORE INTO ekskul (nama, pembina, deskripsi) VALUES 
        ('Pramuka', 'Pak Ahmad', 'Kegiatan kepanduan untuk melatih leadership'),
        ('ROBOTIK', 'Bu Siti', 'Klub robotika dan programming'),
        ('Seni Islami', 'Bu Fatima', 'Pengembangan baca seni islami')`);

    console.log("✅ Data dasar berhasil ditambahkan!");
}

seedData().catch(console.error);