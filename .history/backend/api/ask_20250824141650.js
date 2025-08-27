// Tambahkan di paling atas file
export default async function handler(req, res) {
    // ✅ SET CORS HEADERS - HARUS DITAMBAHKAN
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // ✅ HANDLE PREFLIGHT REQUEST
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ... kode Anda yang sudah ada ...
    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;
            // Your existing logic here
            res.status(200).json({
                answer: "Response dari backend",
                quickReplies: ["Option 1", "Option 2"]
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }
}
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