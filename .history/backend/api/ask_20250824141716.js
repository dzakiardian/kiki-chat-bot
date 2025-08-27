
export default async function handler(req, res) {
    // SET CORS HEADERS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle GET request (untuk testing)
    if (req.method === 'GET') {
        return res.status(200).json({
            message: 'API is working!',
            usage: 'Send POST request with { message: "your message" }'
        });
    }

    // Handle POST request
    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;

            // Your bot logic here
            const response = `Anda berkata: ${message}`;

            res.status(200).json({
                response: response,
                quickReplies: ["Info lebih", "Bantuan lain"]
            });

        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    } else {
        res.status(405).json({
            error: 'Method not allowed'
        });
    }
}