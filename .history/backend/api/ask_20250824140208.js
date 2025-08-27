export default async function handler(req, res) {
    // SET CORS HEADERS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Your API logic here
    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;
            // Process message
            res.status(200).json({
                response: `Anda berkata: ${message}`
            });
        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    }
}