// seed-data.js
const {
    setStatis,
    run
} = require("./db");

async function seedData() {
    // Data statis
    await setStatis("visi", "Tersedianya generasi muda yang profesional, mandiri dan berakhlaqul karimah, serta mendapat ridha Allah SWT, melalui perpaduan Iman Taqwa dan IPTEK.");
    await setStatis("misi", "1. Menyiapkan peserta didik agar menjadi manusia produktif, mampu bekerja mandiri, mengisi lowongan pekerjaan yang ada di dunia usaha dan dunia industri sebagai tenaga kerja tingkat menengah sesuai dengan kompetensi dalam program keahlian masing-masing.\n2.Menyiapkan peserta didik agar mampu memilih karier, ulet dan gigih dalam berkompetisi, beradaptasi di lingkungan kerja, dan mengembangkan sikap professional dalam bidang keahliannya, beraqidah ahlussunnah wal jamaah, dan berakhlaqul karimah\n3. Membekali peserta didik dengan Ilmu Pengetahuan, teknologi, dan seni agar mampu mengembangkan diri di kemudian hari baik secara mandiri maupun melalui jenjang pendidikan yang lebih tinggi.\n4. Membina dan menyiapkan guru/ karyawan yang profesional dan berjiwa pendidik.");
    await setStatis("alamat", "Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah ");
    await setStatis("telp", "(0285) 410447");
    await setStatis("email", "smk_sa@ymail.com");

    // Data jurusan
    await run(`INSERT OR IGNORE INTO jurusan (nama, deskripsi) VALUES 
        ('Teknik Komputer dan Jaringan', 'Jurusan yang mempelajari jaringan komputer dan maintenance'),
        ('Rekayasa Perangkat Lunak', 'Jurusan yang fokus pada pemrograman dan pengembangan software'),
        ('Teknik Kendaraan Ringan', 'Jurusan yang mempelajari perawatan dan perbaikan kendaraan ringan'),
        ('Teknik Sepeda Motor', 'Jurusan yang fokus pada perawatan dan perbaikan sepeda motor'),
        ('Busana Butik', 'Jurusan yang mengajarkan desain dan pembuatan busana'),`);

    // Data ekskul
    await run(`INSERT OR IGNORE INTO ekskul (nama, pembina, deskripsi) VALUES 
        ('Pramuka', 'Pak Ahmad', 'Kegiatan kepanduan untuk melatih leadership'),
        ('ROBOTIK', 'Bu Siti', 'Klub robotika dan programming'),
        ('Seni Islami', 'Bu Fatima', 'Pengembangan baca seni islami')`);

    console.log("✅ Data dasar berhasil ditambahkan!");
}

seedData().catch(console.error);