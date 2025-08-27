import express from "express";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import MarkdownIt from "markdown-it";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT;
const GEMINI_SECRET_API_KEY = process.env.APP_GEMINI_SECRET_API_KEY;

app.use(cors());
app.use(express.urlencoded({ extended: true }), express.json());

const referensi = [
  {
    keywords: ["halo", "hai", "hello", "assalamualaikum", "salam"],
    answer:
      "Halo! 👋 Saya Kiki, rubah kecil asisten SMK Syafi'i Akrom. Mau tahu info apa hari ini?",
    quickReplies: ["Jurusan", "PPDB", "Ekstrakurikuler", "Kontak sekolah"],
  },
  {
    keywords: ["terima kasih", "thanks", "makasih", "syukron"],
    answer: "Sama-sama! 😊 Senang bisa membantu.",
    quickReplies: ["Jurusan", "PPDB", "Berita sekolah"],
  },
  {
    keywords: ["kamu siapa", "siapa kamu", "nama kamu"],
    answer: "Saya adalah AI Assistant SMK Syafi'i Akrom Pekalongan. 🎓",
    quickReplies: ["Info sekolah", "Jurusan", "PPDB"],
  },
  {
    keywords: ["menggambar", "lukis", "desain"],
    answer:
      "Kalau kamu suka menggambar, jurusan yang cocok adalah **Desain Komunikasi Visual (DKV)** atau **Multimedia**.",
  },
  {
    keywords: ["komputer", "coding", "programming", "ngoprek"],
    answer:
      "Kalau kamu suka komputer dan coding, jurusan yang cocok adalah **Rekayasa Perangkat Lunak (RPL)** atau **Teknik Komputer Jaringan (TKJ)**.",
  },
  {
    keywords: ["mesin", "motor", "otomotif"],
    answer:
      "Kalau kamu suka mesin dan otomotif, jurusan yang cocok adalah **Teknik Kendaraan Ringan (TKR)** atau **TBSM**.",
  },
  {
    keywords: ["masak", "kue", "memasak"],
    answer: "Kalau kamu suka memasak, jurusan yang cocok adalah **Tata Boga**.",
  },
  {
    keywords: ["bicara", "public speaking", "komunikasi"],
    answer:
      "Kalau kamu suka public speaking, jurusan yang cocok adalah **Broadcasting**, **Perhotelan**, atau **Pemasaran**.",
  },
  {
    keywords: ["hitung", "ekonomi", "akuntansi"],
    answer:
      "Kalau kamu suka hitung-hitungan, jurusan yang cocok adalah **Akuntansi** atau **Bisnis Daring**.",
  },
];

async function generateResponse(message) {
  try {
    const prompt = `Kamu adalah Kiki, rubah kecil asisten SMK Syafi'i Akrom.
    Jawab HANYA dengan data yang diberikan.

    Data referensi: ${JSON.stringify(referensi)}
    
    Pertanyaan: ${message}`;
    const ai = new GoogleGenAI({ apiKey: GEMINI_SECRET_API_KEY });
    const contents = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];
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

app.get("/api/ping", (req, res) => {
  res.json({
    success: true,
    message: "pong!",
  });
});

app.post("/api/ask", async (req, res) => {
  try {
    const { message: message } = req.body;

    if (!message || message.trim() == "") {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong yak guys",
      });
    }
    const response = await generateResponse(message);

    res.status(200).json({
      success: true,
      statusCode: "Success get response from gemini",
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: "Terjadi kesalahan internal " + error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/ping`);
  console.log(`🤖 Chatbot ready: http://localhost:${PORT}/api/ask`);
});
