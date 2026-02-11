const fs = require('fs');
const path = require('path');

const LOG_DIR = path.dirname(process.env.DB_PATH || './data/cryptoedge.db');
const LOG_FILE = path.join(LOG_DIR, 'errors.log');
const MAX_LOG_SIZE = 1024 * 1024; // 1MB

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateIfNeeded() {
    try {
        if (!fs.existsSync(LOG_FILE)) return;
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
            // Keep last half of the file
            const content = fs.readFileSync(LOG_FILE, 'utf8');
            const lines = content.split('\n');
            const half = Math.floor(lines.length / 2);
            fs.writeFileSync(LOG_FILE, lines.slice(half).join('\n'));
        }
    } catch (err) {
        console.error('Log rotation error:', err.message);
    }
}

function logError(category, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${category}] ${message}`;
    console.error(line);

    try {
        ensureLogDir();
        rotateIfNeeded();
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (err) {
        console.error('Failed to write to error log:', err.message);
    }
}

function getRecentErrors(limit = 50) {
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        return lines.slice(-limit).reverse();
    } catch (err) {
        console.error('Failed to read error log:', err.message);
        return [];
    }
}

module.exports = { logError, getRecentErrors };
