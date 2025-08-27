import cors from '../middleware/cors.js';

export default async function handler(req, res) {
    // Apply CORS middleware
    await new Promise((resolve) => {
        cors(req, res, resolve);
    });

    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;

            // Your bot logic here
            const response = `Anda berkata: ${message}`;

            res.status(200).json({
                answer: response,
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