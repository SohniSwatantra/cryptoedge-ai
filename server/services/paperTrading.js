const { getDB } = require('../db/init');
const { getTicker } = require('./kraken');

async function getCurrentPrice(pair) {
    const tickers = await getTicker([pair]);
    return tickers[pair]?.price;
}

async function openPosition(userId, { pair, direction, quantity, stop_loss, take_profit, confidence }) {
    const db = getDB();
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');

    const price = await getCurrentPrice(pair);
    if (!price) throw new Error(`Could not fetch price for ${pair}`);

    const cost = price * quantity;
    if (cost > user.balance) {
        throw new Error(`Insufficient balance. Need €${cost.toFixed(2)}, have €${user.balance.toFixed(2)}`);
    }

    // Deduct from balance
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(cost, userId);

    const result = db.prepare(`
        INSERT INTO trades (user_id, pair, direction, entry_price, quantity, stop_loss, take_profit, confidence, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(userId, pair, direction, price, quantity, stop_loss || null, take_profit || null, confidence || null);

    return {
        id: result.lastInsertRowid,
        pair, direction, entry_price: price, quantity,
        stop_loss, take_profit, confidence, status: 'open'
    };
}

async function closePosition(userId, tradeId) {
    const db = getDB();
    const trade = db.prepare('SELECT * FROM trades WHERE id = ? AND user_id = ? AND status = ?').get(tradeId, userId, 'open');
    if (!trade) throw new Error('Open trade not found');

    const currentPrice = await getCurrentPrice(trade.pair);
    if (!currentPrice) throw new Error(`Could not fetch price for ${trade.pair}`);

    let pnl;
    if (trade.direction === 'long') {
        pnl = (currentPrice - trade.entry_price) * trade.quantity;
    } else {
        pnl = (trade.entry_price - currentPrice) * trade.quantity;
    }

    const returnAmount = (trade.entry_price * trade.quantity) + pnl;

    db.prepare(`
        UPDATE trades SET exit_price = ?, pnl = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(currentPrice, pnl, tradeId);

    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(returnAmount, userId);

    return {
        id: tradeId,
        pair: trade.pair,
        direction: trade.direction,
        entry_price: trade.entry_price,
        exit_price: currentPrice,
        quantity: trade.quantity,
        pnl,
        status: 'closed'
    };
}

function getOpenPositions(userId) {
    const db = getDB();
    return db.prepare('SELECT * FROM trades WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, 'open');
}

function getTradeHistory(userId, limit = 50) {
    const db = getDB();
    return db.prepare('SELECT * FROM trades WHERE user_id = ? AND status = ? ORDER BY closed_at DESC LIMIT ?').all(userId, 'closed', limit);
}

function getPortfolioSummary(userId) {
    const db = getDB();
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');
    const openTrades = db.prepare('SELECT * FROM trades WHERE user_id = ? AND status = ?').all(userId, 'open');
    const closedTrades = db.prepare(`
        SELECT COUNT(*) as total, SUM(pnl) as total_pnl,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losses
        FROM trades WHERE user_id = ? AND status = 'closed'
    `).get(userId);

    const totalInvested = openTrades.reduce((sum, t) => sum + (t.entry_price * t.quantity), 0);

    return {
        cash_balance: user.balance,
        invested: totalInvested,
        total_value: user.balance + totalInvested,
        open_positions: openTrades.length,
        total_trades: closedTrades.total || 0,
        total_pnl: closedTrades.total_pnl || 0,
        wins: closedTrades.wins || 0,
        losses: closedTrades.losses || 0,
        win_rate: closedTrades.total > 0 ? ((closedTrades.wins / closedTrades.total) * 100).toFixed(1) : '0.0',
    };
}

module.exports = { openPosition, closePosition, getOpenPositions, getTradeHistory, getPortfolioSummary };
