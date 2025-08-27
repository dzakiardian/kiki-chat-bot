const db = require("./src/JS/db");

async function testDB() {
    try {
        console.log("🔄 Testing database connection...");
        const health = await db.healthCheck();
        console.log("✅ Database health:", health);

        // Test query
        const result = await db.get("SELECT COUNT(*) as count FROM statis");
        console.log("✅ Statis table count:", result.count);

        await db.close();
        console.log("✅ Test completed successfully");
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testDB();