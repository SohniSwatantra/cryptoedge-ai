const WebSocket = require('ws');

function initWebSocket(server) {
    const wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        ws.send(JSON.stringify({ type: 'connected', message: 'CryptoEdge AI WebSocket connected' }));

        ws.on('close', () => {
            console.log('WebSocket client disconnected');
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    });

    console.log('WebSocket server initialized on /ws');
    return wss;
}

function broadcast(wss, type, data) {
    if (!wss) return;
    const msg = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

module.exports = { initWebSocket, broadcast };
