const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { name, email, password, exchange_pref, trading_mode } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
        'INSERT INTO users (name, email, password_hash, exchange_pref, trading_mode) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, password_hash, exchange_pref || 'kraken', trading_mode || 'paper');

    const token = jwt.sign(
        { id: result.lastInsertRowid, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.status(201).json({
        token,
        user: { id: result.lastInsertRowid, name, email, exchange_pref: exchange_pref || 'kraken', trading_mode: trading_mode || 'paper' }
    });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, exchange_pref: user.exchange_pref, trading_mode: user.trading_mode }
    });
});

// GET /api/auth/me - get current user
router.get('/me', authMiddleware, (req, res) => {
    const db = getDB();
    const user = db.prepare('SELECT id, name, email, exchange_pref, trading_mode, balance, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

module.exports = router;
