const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDB() {
    if (!db) {
        const dbPath = process.env.DB_PATH || './data/cryptoedge.db';
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initDB() {
    const db = getDB();

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            exchange_pref TEXT DEFAULT 'kraken',
            trading_mode TEXT DEFAULT 'paper',
            balance REAL DEFAULT 10000.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pair TEXT NOT NULL,
            direction TEXT NOT NULL CHECK(direction IN ('long','short')),
            entry_price REAL NOT NULL,
            exit_price REAL,
            quantity REAL NOT NULL,
            stop_loss REAL,
            take_profit REAL,
            status TEXT DEFAULT 'open' CHECK(status IN ('open','closed','cancelled')),
            confidence REAL,
            pnl REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair TEXT NOT NULL,
            direction TEXT NOT NULL CHECK(direction IN ('long','short','hold')),
            confidence REAL NOT NULL,
            price_at_signal REAL NOT NULL,
            rsi REAL,
            macd REAL,
            macd_signal REAL,
            bb_upper REAL,
            bb_lower REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS price_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair TEXT NOT NULL,
            price REAL NOT NULL,
            volume_24h REAL,
            high_24h REAL,
            low_24h REAL,
            change_24h REAL,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
        CREATE INDEX IF NOT EXISTS idx_signals_pair ON signals(pair);
        CREATE INDEX IF NOT EXISTS idx_price_cache_pair ON price_cache(pair);
    `);

    console.log('Database initialized');

    // Run migrations for new LLM signal columns
    migrateDB(db);
}

function migrateDB(db) {
    const migrations = [
        'ALTER TABLE signals ADD COLUMN analysis_text TEXT',
        'ALTER TABLE signals ADD COLUMN market_sentiment TEXT',
        'ALTER TABLE signals ADD COLUMN key_factors TEXT',
        'ALTER TABLE signals ADD COLUMN risk_level TEXT',
        'ALTER TABLE signals ADD COLUMN suggested_entry REAL',
        'ALTER TABLE signals ADD COLUMN suggested_stop_loss REAL',
        'ALTER TABLE signals ADD COLUMN suggested_take_profit REAL',
        'ALTER TABLE signals ADD COLUMN model_version TEXT',
        "ALTER TABLE signals ADD COLUMN analysis_source TEXT DEFAULT 'legacy'",
        'ALTER TABLE signals ADD COLUMN token_usage INTEGER',
        'ALTER TABLE signals ADD COLUMN global_liquidity_assessment TEXT',
    ];

    for (const sql of migrations) {
        try {
            db.exec(sql);
        } catch (err) {
            // Column already exists — safe to ignore
            if (!err.message.includes('duplicate column')) {
                console.error('Migration warning:', err.message);
            }
        }
    }
}

module.exports = { getDB, initDB };
