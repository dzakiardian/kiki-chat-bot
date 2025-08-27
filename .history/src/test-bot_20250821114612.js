// test-bot.js
const {
    getAnswer,
    chatbot
} = require("./bot");

async function testBot() {
    console.log("🚀 Testing ChatBot...\n");

    const testQuestions = [
        "halo",
        "apa saja jurusan di smk syafi'i akrom?",
        "ekskul apa yang ada?",
        "alamat sekolah dimana?",
        "bagaimana cara daftar ppdb?",
        "apa itu teknik komputer jaringan?"
    ];

    for (const question of testQuestions) {
        console.log(`❓ Question: ${question}`);
        const response = await getAnswer(question);
        console.log(`🤖 Answer: ${response.answer.substring(0, 100)}...`);
        console.log(`📌 Quick Replies: ${response.quickReplies.join(', ')}`);
        console.log(`🔧 Source: ${response.source}`);
        console.log("─".repeat(50));
    }

    // Test cache functionality
    console.log("\n🧠 Testing Cache...");
    const cacheStats = chatbot.getCacheStats();
    console.log(`Cache size: ${cacheStats.size}`);
}

// Jalankan test
testBot().catch(console.error);