
export default async function handler(req, res) {
    // HARDCODE CORS HEADERS - PASTI WORK
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const {
                message
            } = req.body;
            console.log('Received message:', message);

            res.status(200).json({
                answer: `Server received: ${message}`,
                quickReplies: ["Test 1", "Test 2"]
            });

        } catch (error) {
            res.status(500).json({
                error: error.message
            });
        }
    } else {
        res.status(404).json({
            error: 'Use POST method'
        });
    }
}