import express from 'express';
import { fetchNews } from './index.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper to get today's date in YYYYMMDD format
const getToday = () => {
    const add0 = num => num < 10 ? ('0' + num) : num;
    const date = new Date();
    return '' + date.getFullYear() + add0(date.getMonth() + 1) + add0(date.getDate());
};

// Endpoint to get latest news (today)
// GET /api/news/latest
app.get('/api/news/latest', async (req, res) => {
    const date = getToday();
    // Redirect to the date endpoint
    res.redirect(`/api/news/${date}`);
});

// Endpoint to get news for a specific date
// GET /api/news/:date (e.g., 20260306)
app.get('/api/news/:date', async (req, res) => {
    const { date } = req.params;
    const filePath = path.join(__dirname, 'news', `${date}.md`);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            res.json({ date, content, source: 'cache' });
        } else {
            // Try to fetch it
            console.log(`News for ${date} not found locally. Fetching...`);
            const result = await fetchNews(date);
            if (result) {
                res.json({ ...result, source: 'fetched' });
            } else {
                res.status(404).json({ error: 'News not found for this date' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
