import express from "express";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import MarkdownIt from 'markdown-it';
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT;
const GEMINI_SECRET_API_KEY = process.env.APP_GEMINI_SECRET_API_KEY;

app.use(cors());
app.use(express.urlencoded({ extended: true }), express.json());

async function generateResponse(message) {
  try {
    const prompt = `Jawab pertanyaan tentang SMK: "${message}"`;
    const ai = new GoogleGenAI({ apiKey: GEMINI_SECRET_API_KEY });
    const contents = [
        {
            role: 'user',
            parts: [
                { text: prompt }
            ]
        }
    ]
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

    return md.render(buffer.join(''));
  } catch (error) {
    throw error;
  }
}

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

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server berjalan normal",
    gemini: true,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Chatbot ready: http://localhost:${PORT}/api/ask`);
});
