import express from "express";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import MarkdownIt from "markdown-it";
import dotenv from "dotenv";
import cors from "cors";
import Fuse from "fuse.js"; // ✔ pakai import, bukan require

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;
const GEMINI_SECRET_API_KEY = process.env.APP_GEMINI_SECRET_API_KEY;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const referensi = [
  {
    keywords: ["halo", "hai", "hello", "assalamualaikum", "salam"],
    answer:
      "Halo! 👋 Saya Chat54, AI asisten SMKSA. Mau tahu info apa hari ini?",
    quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
    topik: "sapaan",
  },
  //   {
  //     keywords: ["terima kasih", "thanks", "makasih", "syukron"],
  //     answer: "Sama-sama! 😊 Senang bisa membantu.",
  //     quickReplies: ["Jurusan", "PPDB", "Berita sekolah"],
  //     topik: "santun",
  //   },
  //   {
  //     keywords: ["kamu siapa", "siapa kamu", "nama kamu", "kau siapa"],
  //     answer: "Saya adalah AI Assistant SMKSA Pekalongan. 🎓",
  //     quickReplies: ["Info sekolah", "Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
  //     topik: "identitas",
  //   },
  //   {
  //     keywords: ["program", "coding", "software", "aplikasi", "developer"],
  //     answer:
  //       "Kalau kamu suka membuat program atau aplikasi, jurusan yang cocok adalah **Rekayasa Perangkat Lunak (RPL)**.",
  //     quickReplies: ["Jurusan RPL"],
  //     topik: "jurusan_rpl",
  //   },
  //   {
  //     keywords: ["jaringan", "internet", "server", "komputer", "IT", "wifi"],
  //     answer:
  //       "Kalau kamu suka komputer dan jaringan, jurusan yang cocok adalah **Teknik Jaringan dan Komputer (TJK)**.",
  //     quickReplies: ["Jurusan TJK"],
  //     topik: "jurusan_tjk",
  //   },
  //   {
  //     keywords: ["motor", "otomotif", "montir motor", "perbaikan motor"],
  //     answer:
  //       "Kalau kamu suka memperbaiki atau merakit motor, jurusan yang cocok adalah **Teknik Sepeda Motor (TSM)**.",
  //     quickReplies: ["Jurusan TSM"],
  //     topik: "jurusan_tsm",
  //   },
  //   {
  //     keywords: ["mobil", "kendaraan", "otomotif", "perbaikan mobil"],
  //     answer:
  //       "Kalau kamu suka memperbaiki atau merawat mobil, jurusan yang cocok adalah **Teknik Kendaraan Ringan (TKR)**.",
  //     quickReplies: ["Jurusan TKR"],
  //     topik: "jurusan_tkr",
  //   },
  //   {
  //     keywords: ["busana", "fashion", "desain pakaian", "jahit", "butik"],
  //     answer:
  //       "Kalau kamu suka merancang atau membuat pakaian, jurusan yang cocok adalah **Desain Produksi Busana Butik (DPBB)**.",
  //     quickReplies: ["Jurusan DPBB"],
  //     topik: "jurusan_dpbb",
  //   },
  //   {
  //     keywords: ["ppdb", "pendaftaran", "biaya sekolah", "registrasi"],
  //     answer:
  //       "Untuk informasi PPDB, silakan kunjungi https://ppdb.ponpes-smksa.sch.id/ untuk info pendaftaran dan biaya sekolah.",
  //     quickReplies: ["Info PPDB", "Biaya sekolah"],
  //     topik: "ppdb",
  //   },
  //   {
  //     keywords: ["bkk", "lowongan kerja", "magang", "pekerjaan"],
  //     answer:
  //       "Untuk informasi Bursa Kerja Khusus (BKK), silakan kunjungi https://bkk.ponpes-smksa.sch.id/ untuk lowongan kerja dan magang.",
  //     quickReplies: ["Info BKK", "Lowongan kerja"],
  //     topik: "bkk",
  //   },
  //   {
  //     keywords: ["ekskul", "ekstrakurikuler", "organisasi", "klub"],
  //     answer:
  //       "Beberapa ekstrakurikuler di SMKSA antara lain: Pramuka, Paskibra, Futsal, Basket, dan masih banyak lagi.",
  //     quickReplies: ["Info ekstrakurikuler"],
  //     topik: "ekstrakurikuler",
  //   },
  //   {
  //     keywords: ["kontak", "alamat", "telepon", "email", "hubungi"],
  //     answer:
  //       "Kamu bisa menghubungi kami di:\n\n- Alamat: Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah \n- Telepon: (0285) 410447\n- Email: smk_sa@ymail.com",
  //     quickReplies: ["Info kontak"],
  //     topik: "kontak",
  //   },
  //   {
  //     keywords: ["profil sekolah", "sejarah sekolah", "visi misi", "akreditasi"],
  //     answer:
  //       "SMK Syafi'i Akrom adalah sekolah menengah kejuruan berbasis pondok pesantren yang berlokasi di Jl. Pelita 1 No. 322, Perum Buaran Indah, Kota Pekalongan, Jawa Tengah. Dengan 5 program keahlian: RPL, TJK, TSM, TKR, dan DPBB.",
  //     quickReplies: ["Visi & Misi", "Akreditasi", "Sejarah Sekolah"],
  //     topik: "profil_sekolah",
  //   },
  //   {
  //     keywords: ["visi misi", "misi sekolah", "tujuan sekolah"],
  //     answer:
  //       "Visi SMKSA: 'Tersedianya generasi muda yang profesional, mandiri, dan berakhlaqul karimah melalui perpaduan Iman Taqwa dan IPTEK.'",
  //     quickReplies: ["Profil Sekolah", "Akreditasi", "Sejarah Sekolah"],
  //     topik: "visi_misi",
  //   },
  //   {
  //     keywords: ["akreditasi", "status akreditasi", "peringkat akreditasi"],
  //     answer:
  //       "SMKSA telah terakreditasi dengan peringkat yang baik, menunjukkan komitmen sekolah dalam menyediakan pendidikan berkualitas.",
  //     quickReplies: ["Profil Sekolah", "Visi & Misi", "Sejarah Sekolah"],
  //     topik: "akreditasi",
  //   },
  //   {
  //     keywords: [
  //       "halo",
  //       "hai",
  //       "hello",
  //       "assalamualaikum",
  //       "salam",
  //       "selamat pagi",
  //       "selamat siang",
  //       "selamat sore",
  //       "selamat malam",
  //       "hey",
  //       "hiya",
  //       "hallo",
  //       "haii",
  //     ],
  //     answer:
  //       "Halo! 👋 Saya Chat54, AI asisten SMKSA. Mau tahu info apa hari ini?",
  //     quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
  //   },
  //   {
  //     keywords: [
  //       "terima kasih",
  //       "thanks",
  //       "makasih",
  //       "syukron",
  //       "thank you",
  //       "thx",
  //       "tq",
  //       "matur nuwun",
  //       "saya berterima kasih",
  //       "thanks a lot",
  //     ],
  //     answer: "Sama-sama! 😊 Senang bisa membantu.",
  //     quickReplies: ["Jurusan", "PPDB", "Berita sekolah"],
  //   },
  //   {
  //     keywords: [
  //       "kamu siapa",
  //       "siapa kamu",
  //       "nama kamu",
  //       "kau siapa",
  //       "namamu siapa",
  //       "kamu siapa sebenarnya",
  //       "siapa asisten",
  //       "asisten siapa",
  //       "identitas kamu",
  //     ],
  //     answer: "Saya adalah AI Assistant SMKSA Pekalongan. 🎓",
  //     quickReplies: [
  //       "Info sekolah",
  //       "Jurusan",
  //       "PPDB",
  //       "Ekstrakurikuler",
  //       "Kontak sekolah",
  //     ],
  //   },
  //   {
  //     keywords: [
  //       "program",
  //       "coding",
  //       "software",
  //       "aplikasi",
  //       "developer",
  //       "aplikasi web",
  //       "aplikasi mobile",
  //       "pemrograman",
  //       "koding",
  //       "python",
  //       "java",
  //       "html",
  //       "css",
  //       "javascript",
  //       "programmer",
  //       "engineer",
  //       "software engineer",
  //       "app developer",
  //     ],
  //     answer:
  //       "Kalau kamu suka membuat program atau aplikasi, jurusan yang cocok adalah **Rekayasa Perangkat Lunak (RPL)**.",
  //     quickReplies: ["Jurusan RPL"],
  //   },
  //   {
  //     keywords: [
  //       "jaringan",
  //       "internet",
  //       "server",
  //       "komputer",
  //       "IT",
  //       "wifi",
  //       "LAN",
  //       "networking",
  //       "teknologi informasi",
  //       "router",
  //       "switch",
  //       "firewall",
  //       "cloud",
  //       "administrator jaringan",
  //       "network admin",
  //       "network engineer",
  //       "teknisi IT",
  //     ],
  //     answer:
  //       "Kalau kamu suka komputer dan jaringan, jurusan yang cocok adalah **Teknik Jaringan dan Komputer (TJK)**.",
  //     quickReplies: ["Jurusan TJK"],
  //   },
  //   {
  //     keywords: [
  //       "motor",
  //       "sepeda motor",
  //       "mesin",
  //       "otomotif",
  //       "service motor",
  //       "montir motor",
  //       "perbaikan motor",
  //       "rakit motor",
  //       "oli",
  //       "rem",
  //       "ban",
  //       "suspensi",
  //       "teknisi motor",
  //       "motor listrik",
  //       "perawatan motor",
  //       "bengkel motor",
  //     ],
  //     answer:
  //       "Kalau kamu suka memperbaiki atau merakit motor, jurusan yang cocok adalah **Teknik Sepeda Motor (TSM)**.",
  //     quickReplies: ["Jurusan TSM"],
  //   },
  //   {
  //     keywords: [
  //       "mobil",
  //       "kendaraan",
  //       "otomotif",
  //       "mesin mobil",
  //       "service mobil",
  //       "montir mobil",
  //       "perbaikan mobil",
  //       "rakit mobil",
  //       "oli mobil",
  //       "rem mobil",
  //       "ban mobil",
  //       "suspensi mobil",
  //       "teknisi mobil",
  //       "mechanic mobil",
  //       "car repair",
  //       "service kendaraan",
  //     ],
  //     answer:
  //       "Kalau kamu suka memperbaiki atau merawat mobil, jurusan yang cocok adalah **Teknik Kendaraan Ringan (TKR)**.",
  //     quickReplies: ["Jurusan TKR"],
  //   },
  //   {
  //     keywords: [
  //       "busana",
  //       "fashion",
  //       "desain pakaian",
  //       "butik",
  //       "jahit",
  //       "merancang baju",
  //       "desain fashion",
  //       "konveksi",
  //       "bahan kain",
  //       "pola",
  //       "mesin jahit",
  //       "stylist",
  //       "fashion designer",
  //       "couture",
  //       "pakaian",
  //       "textile",
  //     ],
  //     answer:
  //       "Kalau kamu suka merancang atau membuat pakaian, jurusan yang cocok adalah **Desain Produksi Busana Butik (DPBB)**.",
  //     quickReplies: ["Jurusan DPBB"],
  //   },
  //   {
  //     keywords: [
  //       "ppdb",
  //       "pendaftaran",
  //       "daftar",
  //       "registrasi",
  //       "biaya sekolah",
  //       "tahun ajaran baru",
  //       "cara daftar",
  //       "formulir",
  //       "online",
  //       "pendaftaran online",
  //       "sekolah baru",
  //       "info ppdb",
  //       "registrasi siswa",
  //       "pendaftaran siswa",
  //     ],
  //     answer:
  //       "Untuk informasi PPDB, silakan kunjungi https://ppdb.ponpes-smksa.sch.id/ untuk info pendaftaran dan biaya sekolah.",
  //     quickReplies: ["Info PPDB", "Biaya sekolah"],
  //   },
  //   {
  //     keywords: [
  //       "bkk",
  //       "lowongan kerja",
  //       "kerja",
  //       "magang",
  //       "lapangan kerja",
  //       "career",
  //       "internship",
  //       "job",
  //       "pekerjaan",
  //       "CV",
  //       "lamaran",
  //       "kerja praktek",
  //       "kerja siswa",
  //       "peluang kerja",
  //     ],
  //     answer:
  //       "Untuk informasi Bursa Kerja Khusus (BKK), silakan kunjungi https://bkk.ponpes-smksa.sch.id/ untuk lowongan kerja dan magang.",
  //     quickReplies: ["Info BKK", "Lowongan kerja"],
  //   },
  //   {
  //     keywords: [
  //       "ekskul",
  //       "ekstrakurikuler",
  //       "organisasi",
  //       "klub",
  //       "kegiatan sekolah",
  //       "olahraga",
  //       "seni",
  //       "pramuka",
  //       "basket",
  //       "futsal",
  //       "paskibra",
  //       "musik",
  //       "teater",
  //       "robotik",
  //       "club",
  //       "extracurricular",
  //       "ekstra",
  //     ],
  //     answer:
  //       "Beberapa ekstrakurikuler di SMKSA antara lain: Pramuka, Paskibra, Futsal, Basket, dan masih banyak lagi.",
  //     quickReplies: ["Info ekstrakurikuler"],
  //   },
  //   {
  //     keywords: [
  //       "kontak",
  //       "alamat",
  //       "telepon",
  //       "email",
  //       "hubungi",
  //       "cara menghubungi",
  //       "office",
  //       "nomor sekolah",
  //       "contact",
  //       "no telp",
  //       "email sekolah",
  //       "alamat sekolah",
  //     ],
  //     answer:
  //       "Kamu bisa menghubungi kami di:\n\n- Alamat: Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah \n- Telepon: (0285) 410447\n- Email: smk_sa@ymail.com",
  //     quickReplies: ["Info kontak"],
  //   },
  //   // Profil Sekolah
  //   {
  //     keywords: [
  //       "profil sekolah",
  //       "tentang sekolah",
  //       "sejarah sekolah",
  //       "visi misi",
  //       "akreditasi",
  //       "identitas sekolah",
  //       "alamat sekolah",
  //       "lokasi sekolah",
  //       "sekolah SMK Syafi'i Akrom",
  //       "SMK Syafi'i Akrom Pekalongan",
  //       "SMKSA",
  //       "SMK Syafi'i Akrom profil",
  //       "SMK Syafi'i Akrom sejarah",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom adalah sekolah menengah kejuruan berbasis pondok pesantren yang berlokasi di Jl. Pelita 1 No. 322, Perum Buaran Indah, Kota Pekalongan, Jawa Tengah. Dengan 5 program keahlian: Rekayasa Perangkat Lunak (RPL), Teknik Jaringan dan Komputer (TJK), Teknik Sepeda Motor (TSM), Teknik Kendaraan Ringan (TKR), dan Desain Produksi Busana Butik (DPBB).",
  //     quickReplies: ["Visi & Misi", "Akreditasi", "Sejarah Sekolah"],
  //   },

  //   // Visi & Misi
  //   {
  //     keywords: [
  //       "visi misi",
  //       "visi dan misi",
  //       "tujuan sekolah",
  //       "misi sekolah",
  //       "visi SMK Syafi'i Akrom",
  //       "misi SMK Syafi'i Akrom",
  //       "tujuan SMK Syafi'i Akrom",
  //     ],
  //     answer:
  //       "Visi SMK Syafi'i Akrom: 'Tersedianya generasi muda yang profesional, mandiri, dan berakhlaqul karimah, serta mendapat ridha Allah SWT, melalui perpaduan Iman Taqwa dan IPTEK.'",
  //     quickReplies: ["Profil Sekolah", "Akreditasi", "Sejarah Sekolah"],
  //   },

  //   // Akreditasi
  //   {
  //     keywords: [
  //       "akreditasi",
  //       "status akreditasi",
  //       "nilai akreditasi",
  //       "peringkat akreditasi",
  //       "akreditasi SMK Syafi'i Akrom",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom telah terakreditasi dengan peringkat yang baik, menunjukkan komitmen sekolah dalam menyediakan pendidikan berkualitas.",
  //     quickReplies: ["Profil Sekolah", "Visi & Misi", "Sejarah Sekolah"],
  //   },

  //   // Sarana & Prasarana
  //   {
  //     keywords: [
  //       "fasilitas sekolah",
  //       "sarana sekolah",
  //       "prasarana sekolah",
  //       "laboratorium",
  //       "perpustakaan",
  //       "ruang kelas",
  //       "ruang komputer",
  //       "wifi sekolah",
  //       "lapangan olahraga",
  //       "workshop",
  //       "studio desain",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom dilengkapi dengan fasilitas modern seperti ruang kelas representatif, laboratorium komputer berbasis multimedia, laboratorium teknik komputer & jaringan, serta fasilitas olahraga dan seni.",
  //     quickReplies: ["Profil Sekolah", "Visi & Misi", "Akreditasi"],
  //   },

  //   // Jumlah Kelas & Guru
  //   {
  //     keywords: [
  //       "jumlah kelas",
  //       "jumlah guru",
  //       "jumlah rombel",
  //       "jumlah siswa",
  //       "rasio siswa per guru",
  //       "kelas X",
  //       "kelas XI",
  //       "kelas XII",
  //       "jumlah rombel kelas X",
  //       "jumlah rombel kelas XI",
  //       "jumlah rombel kelas XII",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom memiliki 36 kelas dengan rincian: Kelas X: 14 rombel, Kelas XI: 12 rombel, Kelas XII: 10 rombel. Dilengkapi dengan 66 tenaga pengajar profesional.",
  //     quickReplies: ["Profil Sekolah", "Visi & Misi", "Akreditasi"],
  //   },

  //   // PPDB (Penerimaan Peserta Didik Baru)
  //   {
  //     keywords: [
  //       "ppdb",
  //       "pendaftaran",
  //       "daftar",
  //       "registrasi",
  //       "biaya sekolah",
  //       "tahun ajaran baru",
  //       "cara daftar",
  //       "formulir",
  //       "online",
  //       "pendaftaran online",
  //       "sekolah baru",
  //       "info ppdb",
  //       "registrasi siswa",
  //       "pendaftaran siswa",
  //     ],
  //     answer:
  //       "Untuk informasi PPDB, silakan kunjungi https://ppdb.ponpes-smksa.sch.id/ untuk info pendaftaran dan biaya sekolah.",
  //     quickReplies: ["Info PPDB", "Biaya sekolah"],
  //   },

  //   // Ekstrakurikuler
  //   {
  //     keywords: [
  //       "ekskul",
  //       "ekstrakurikuler",
  //       "organisasi",
  //       "klub",
  //       "kegiatan sekolah",
  //       "olahraga",
  //       "seni",
  //       "pramuka",
  //       "basket",
  //       "futsal",
  //       "paskibra",
  //       "musik",
  //       "teater",
  //       "robotik",
  //       "club",
  //       "extracurricular",
  //       "ekstra",
  //     ],
  //     answer:
  //       "Beberapa ekstrakurikuler di SMK Syafi'i Akrom antara lain: Pramuka, Paskibra, Futsal, Basket, dan masih banyak lagi.",
  //     quickReplies: ["Info ekstrakurikuler"],
  //   },

  //   // Kontak Sekolah
  //   {
  //     keywords: [
  //       "kontak",
  //       "alamat",
  //       "telepon",
  //       "email",
  //       "hubungi",
  //       "cara menghubungi",
  //       "office",
  //       "nomor sekolah",
  //       "contact",
  //       "no telp",
  //       "email sekolah",
  //       "alamat sekolah",
  //     ],
  //     answer:
  //       "Kamu bisa menghubungi kami di:\n\n- Alamat: Jl. Pelita 1 No. 322 (Perum Buaran Indah) Kota Pekalongan Jawa Tengah \n- Telepon: (0285) 410447\n- Email: smk_sa@ymail.com",
  //     quickReplies: ["Info kontak"],
  //   },

  //   // BKK (Bursa Kerja Khusus)
  //   {
  //     keywords: [
  //       "bkk",
  //       "lowongan kerja",
  //       "kerja",
  //       "magang",
  //       "lapangan kerja",
  //       "career",
  //       "internship",
  //       "job",
  //       "pekerjaan",
  //       "CV",
  //       "lamaran",
  //       "kerja praktek",
  //       "kerja siswa",
  //       "peluang kerja",
  //     ],
  //     answer:
  //       "Untuk informasi Bursa Kerja Khusus (BKK), silakan kunjungi https://bkk.ponpes-smksa.sch.id/ untuk lowongan kerja dan magang.",
  //     quickReplies: ["Info BKK", "Lowongan kerja"],
  //   },

  //   // Profil Guru & Wali Kelas
  //   {
  //     keywords: [
  //       "guru",
  //       "wali kelas",
  //       "pengajar",
  //       "guru BK",
  //       "guru mapel",
  //       "staff pengajar",
  //       "daftar guru",
  //       "profil guru",
  //       "wali kelas TKR",
  //       "wali kelas RPL",
  //       "wali kelas TSM",
  //       "wali kelas TJK",
  //       "wali kelas DPBB",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom memiliki tenaga pengajar profesional di setiap program keahlian. Untuk informasi lebih lanjut mengenai profil guru dan wali kelas, silakan kunjungi halaman profil guru di situs resmi kami.",
  //     quickReplies: ["Info Guru", "Wali Kelas", "Profil Guru"],
  //   },

  //   // Kegiatan Siswa & Lomba
  //   {
  //     keywords: [
  //       "lomba",
  //       "kompetisi",
  //       "kegiatan siswa",
  //       "kegiatan sekolah",
  //       "event sekolah",
  //       "acara sekolah",
  //       "pentas seni",
  //       "pertunjukan",
  //       "festival",
  //       "seminar",
  //       "workshop",
  //       "pelatihan",
  //       "study tour",
  //       "kegiatan ekstrakurikuler",
  //       "kegiatan OSIS",
  //       "kegiatan kelas",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom rutin mengadakan berbagai kegiatan siswa seperti lomba, seminar, workshop, dan kegiatan ekstrakurikuler lainnya. Untuk informasi terbaru, silakan kunjungi halaman kegiatan siswa di situs resmi kami.",
  //     quickReplies: ["Info Kegiatan", "Lomba", "Workshop"],
  //   },

  //   // Beasiswa & Bantuan Biaya
  //   {
  //     keywords: [
  //       "beasiswa",
  //       "bantuan biaya",
  //       "uang sekolah",
  //       "grant",
  //       "scholarship",
  //       "prestasi",
  //       "bantuan pendidikan",
  //       "bantuan siswa",
  //       "bantuan pemerintah",
  //       "bantuan yayasan",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom menyediakan berbagai program beasiswa bagi siswa berprestasi dan kurang mampu. Untuk informasi lebih lanjut, silakan kunjungi halaman beasiswa di situs resmi kami.",
  //     quickReplies: ["Info Beasiswa", "Bantuan Biaya", "Program Beasiswa"],
  //   },

  //   // Fasilitas Sekolah
  //   {
  //     keywords: [
  //       "laboratorium",
  //       "workshop",
  //       "perpustakaan",
  //       "kelas",
  //       "ruang komputer",
  //       "lapangan",
  //       "gym",
  //       "studio",
  //       "mesin",
  //       "alat praktek",
  //       "wifi sekolah",
  //       "ruang kelas representatif",
  //       "fasilitas olahraga",
  //       "fasilitas seni",
  //       "fasilitas komputer",
  //       "fasilitas multimedia",
  //     ],
  //     answer:
  //       "SMK Syafi'i Akrom dilengkapi dengan fasilitas modern seperti ruang kelas representatif, laboratorium komputer berbasis multimedia, laboratorium teknik komputer & jaringan, serta fasilitas olahraga dan seni.",
  //     quickReplies: ["Info Fasilitas", "Laboratorium", "Workshop"],
  //   },

  //   // Jadwal Pelajaran & Kalender Akademik
  //   {
  //     keywords: [
  //       "jadwal pelajaran",
  //       "mata pelajaran",
  //       "jam masuk",
  //       "jam pulang",
  //       "kalender akademik",
  //       "kalender sekolah",
  //       "jadwal kelas X",
  //       "jadwal kelas XI",
  //       "jadwal kelas XII",
  //       "jadwal ujian",
  //       "jadwal kegiatan",
  //       "kalender ujian",
  //       "kalender kegiatan",
  //     ],
  //     answer:
  //       "Untuk informasi jadwal pelajaran dan kalender akademik, silakan kunjungi halaman jadwal di situs resmi kami.",
  //     quickReplies: ["Jadwal Pelajaran", "Kalender Akademik", "Jadwal Ujian"],
  //   },

  //   // Informasi Alumni & Lulusan
];

// ================= FUSE.JS =================
const fuse = new Fuse(referensi, {
  keys: ["keywords"],
  threshold: 0.3,
});

// Simpan topik terakhir
let topikTerakhir = null;

function cariJawaban(userInput) {
  const input = userInput.toLowerCase();

  // Jika user cuma minta link atau info lanjutan
  if (
    ["link", "link nya", "minta link", "beri link"].some((k) =>
      input.includes(k)
    )
  ) {
    if (topikTerakhir === "ppdb")
      return "Link PPDB: https://ppdb.ponpes-smksa.sch.id/";
    if (topikTerakhir === "bkk")
      return "Link BKK: https://bkk.ponpes-smksa.sch.id/";
    // bisa ditambah topik lain jika ada
  }

  const hasil = fuse.search(userInput);
  if (hasil.length > 0) {
    topikTerakhir = hasil[0].item.topik || null; // simpan topik terakhir
    return hasil[0].item.answer;
  }

  return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.";
}
// ================= GOOGLE GEMINI =================
async function generateResponse(message) {
  try {
    const prompt = `Anda adalah asisten AI untuk website SMK Syafi'i Akrom. 
- Jawab pertanyaan dengan pengetahuan mu yang luas
- jawab semua oertanyaan


Pertanyaan: ${message}`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_SECRET_API_KEY });

    const contents = [{ role: "user", parts: [{ text: prompt }] }];

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    let buffer = [];
    const md = new MarkdownIt();

    for await (const response of stream) {
      buffer.push(response.text);
    }

    return md.render(buffer.join(""));
  } catch (error) {
    throw error;
  }
}

// ================= API ROUTES =================
app.get("/api/ping", (req, res) => {
  res.json({ success: true, message: "pong!" });
});

app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    // 🔍 Cek referensi dulu dengan Fuse.js
    const jawabanReferensi = cariJawaban(message);

    if (
      jawabanReferensi !==
      "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut."
    ) {
      return res.status(200).json({
        success: true,
        statusCode: "Success get response from referensi",
        data: jawabanReferensi,
        quickReplies: [], // bisa diisi sesuai referensi jika mau
      });
    }

    // Kalau tidak ada di referensi → ke Gemini
    const response = await generateResponse(message);

    res.status(200).json({
      success: true,
      statusCode: "Success get response from gemini",
      data: response,
      quickReplies: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: "Terjadi kesalahan internal: " + error.message,
    });
  }
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/ping`);
  console.log(`🤖 Chatbot ready: http://localhost:${PORT}/api/ask`);
});
