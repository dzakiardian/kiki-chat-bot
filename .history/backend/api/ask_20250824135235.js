export default async function handler(req, res) {
    // SET CORS HEADERS FIRST
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Your API logic
    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;
            // Process your message
            res.status(200).json({
                response: `Received: ${message}`,
                quickReplies: ["Info lebih", "Bantuan lain"]
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    } else {
        res.status(404).json({
            error: 'Not found'
        });
    }
}