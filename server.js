require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initDB } = require('./server/db/init');
const { initWebSocket } = require('./server/services/websocket');
const { startSignalEngine } = require('./server/services/signals');
const { startPriceFeed } = require('./server/services/priceFeed');

// Validate critical env vars in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/market', require('./server/routes/market'));
app.use('/api/trade', require('./server/routes/trade'));
app.use('/api/portfolio', require('./server/routes/portfolio'));
app.use('/api/signals', require('./server/routes/signals'));
app.use('/api/kraken', require('./server/routes/krakenLive'));

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// SPA fallback - serve index.html for non-API routes
app.get('/{*splat}', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Initialize
initDB();
const wss = initWebSocket(server);
startPriceFeed(wss);
startSignalEngine(wss);

server.listen(PORT, () => {
    console.log(`CryptoEdge AI server running on http://localhost:${PORT}`);
    console.log(`Live trading: ${process.env.LIVE_TRADING_ENABLED === 'true' ? 'ENABLED' : 'DISABLED (paper mode)'}`);
});
