const pptxgen = require('pptxgenjs');

const pptx = new pptxgen();

// ── Brand Colors (matching Oatmeal-inspired dark teal theme) ──
const BG_DARK    = '0C1616';
const BG_CARD    = '162121';
const BG_CARD_LT = '1A2828';
const ACCENT     = '3ECF8E';
const ACCENT_DK  = '2FA872';
const GOLD       = 'E2B93B';
const CORAL      = 'E05252';
const SOFT_GREEN = '3ECF8E';
const SOFT_BLUE  = '5BA4CF';
const LAVENDER   = '9B7FD4';
const WHITE      = 'FFFFFF';
const LIGHT_GRAY = 'C8D0D0';
const MID_GRAY   = '7A8A8A';
const CARD_BORDER= '1E2E2E';
const DIVIDER    = '253535';

// Presentation metadata
pptx.author = 'CryptoEdge AI';
pptx.company = 'CryptoEdge AI';
pptx.subject = 'AI-Powered Crypto Trading Platform';
pptx.title = 'CryptoEdge AI - Platform Overview';
pptx.layout = 'LAYOUT_WIDE';

const FONT_HEADING = 'Georgia';
const FONT = 'Calibri';

// ── Helper: Professional circle icon (replaces emojis) ──
function addIcon(slide, x, y, symbol, bgColor, size = 0.42) {
    slide.addShape(pptx.ShapeType.ellipse, {
        x, y, w: size, h: size,
        fill: { type: 'solid', color: bgColor },
    });
    slide.addText(symbol, {
        x, y, w: size, h: size,
        fontSize: size * 24, fontFace: FONT, bold: true,
        color: WHITE, align: 'center', valign: 'middle',
    });
}

// ── Helper: Card with header divider ──
function addCard(slide, x, y, w, h, opts = {}) {
    slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w, h,
        fill: { type: 'solid', color: opts.fill || BG_CARD },
        rectRadius: 0.08,
        line: { color: opts.border || CARD_BORDER, width: 0.75 },
        shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.12 },
    });
}

// ── Helper: Horizontal divider line ──
function addDivider(slide, x, y, w, color = DIVIDER) {
    slide.addShape(pptx.ShapeType.rect, {
        x, y, w, h: 0.015,
        fill: { type: 'solid', color },
    });
}

// ── Helper: Section title bar at top of slide ──
function addSlideHeader(slide, title, subtitle) {
    // Thin accent bar at very top
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.05,
        fill: { type: 'solid', color: ACCENT },
    });
    slide.addText(title, {
        x: 0.7, y: 0.25, w: 10, h: 0.55,
        fontSize: 28, fontFace: FONT_HEADING, color: WHITE,
    });
    if (subtitle) {
        slide.addText(subtitle, {
            x: 0.7, y: 0.75, w: 10, h: 0.35,
            fontSize: 13, fontFace: FONT, color: LIGHT_GRAY,
        });
    }
    // Divider below header
    addDivider(slide, 0.7, 1.15, 11.93, DIVIDER);
}

// ════════════════════════════════════════════════════
// SLIDE 1: Title
// ════════════════════════════════════════════════════
let s1 = pptx.addSlide();
s1.background = { fill: BG_DARK };

// Thin accent bar
s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.05,
    fill: { type: 'solid', color: ACCENT },
});

// Subtle glow behind logo
s1.addShape(pptx.ShapeType.ellipse, {
    x: 5.5, y: 1.0, w: 2.33, h: 2.33,
    fill: { type: 'solid', color: ACCENT },
    transparency: 92,
});

// Logo - serif style like "CryptoEdge."
s1.addText('CryptoEdge.', {
    x: 1, y: 2.0, w: 11.33, h: 1.0,
    fontSize: 52, fontFace: FONT_HEADING, color: WHITE, align: 'center',
});

// Subtitle
s1.addText('AI-Powered Cryptocurrency Trading Platform', {
    x: 2, y: 3.1, w: 9.33, h: 0.5,
    fontSize: 20, fontFace: FONT, color: ACCENT, align: 'center',
});

// Description
s1.addText('Machine learning models analyzing BTC & ETH patterns to generate\nhigh-confidence trading signals with direct Kraken exchange integration', {
    x: 2.5, y: 3.8, w: 8.33, h: 0.7,
    fontSize: 13, fontFace: FONT, color: LIGHT_GRAY, align: 'center', lineSpacingMultiple: 1.5,
});

// Live URL
s1.addText('https://cryptoedge-ai.onrender.com', {
    x: 2.5, y: 4.6, w: 8.33, h: 0.4,
    fontSize: 14, fontFace: FONT, color: MID_GRAY, align: 'center',
});

// Bottom strip with 4 pillars
s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 6.2, w: '100%', h: 1.0,
    fill: { type: 'solid', color: BG_CARD },
    line: { color: CARD_BORDER, width: 0.5 },
});
const pillars = [
    { icon: 'AI', label: 'Signal Engine', color: ACCENT },
    { icon: 'K', label: 'Kraken Integration', color: SOFT_BLUE },
    { icon: 'PT', label: 'Paper Trading', color: SOFT_GREEN },
    { icon: 'WS', label: 'Real-Time Data', color: GOLD },
];
pillars.forEach((p, i) => {
    const x = 1.0 + i * 3.1;
    addIcon(s1, x, 6.43, p.icon, p.color, 0.38);
    s1.addText(p.label, {
        x: x + 0.5, y: 6.38, w: 2.2, h: 0.48,
        fontSize: 12, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
    });
});

// ════════════════════════════════════════════════════
// SLIDE 2: Problem & Solution
// ════════════════════════════════════════════════════
let s2 = pptx.addSlide();
s2.background = { fill: BG_DARK };
addSlideHeader(s2, 'The Challenge & Our Solution', 'Why CryptoEdge AI exists');

// Problem card
addCard(s2, 0.7, 1.35, 5.8, 5.45);
addIcon(s2, 1.0, 1.55, '!', CORAL, 0.38);
s2.addText('The Challenge', {
    x: 1.5, y: 1.5, w: 4.5, h: 0.45,
    fontSize: 19, fontFace: FONT_HEADING, bold: true, color: CORAL,
});
addDivider(s2, 1.0, 2.05, 5.2, DIVIDER);

const problems = [
    'Crypto markets operate 24/7 -- impossible to monitor manually',
    'Emotional trading leads to poor decisions and capital loss',
    'Technical analysis requires deep expertise and significant time',
    'Most retail traders lose money (70-80% failure rate)',
    'Expensive subscription services with unproven track records',
];
problems.forEach((p, i) => {
    addIcon(s2, 1.1, 2.25 + i * 0.78, 'x', '3A4A4A', 0.26);
    s2.addText(p, {
        x: 1.5, y: 2.2 + i * 0.78, w: 4.7, h: 0.55,
        fontSize: 12, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
    });
});

// Solution card
addCard(s2, 6.83, 1.35, 5.8, 5.45, { border: ACCENT });
addIcon(s2, 7.13, 1.55, '\u2713', ACCENT, 0.38);
s2.addText('Our Solution', {
    x: 7.63, y: 1.5, w: 4.5, h: 0.45,
    fontSize: 19, fontFace: FONT_HEADING, bold: true, color: ACCENT,
});
addDivider(s2, 7.13, 2.05, 5.2, ACCENT_DK);

const solutions = [
    'Automated 24/7 market analysis -- never miss a trading signal',
    'AI removes emotion -- purely data-driven decision making',
    '50+ technical indicators computed and scored automatically',
    'Paper trading mode -- validate strategies before risking capital',
    'Self-hosted and open source -- zero subscription fees',
];
solutions.forEach((sol, i) => {
    addIcon(s2, 7.23, 2.25 + i * 0.78, '\u2713', ACCENT_DK, 0.26);
    s2.addText(sol, {
        x: 7.63, y: 2.2 + i * 0.78, w: 4.7, h: 0.55,
        fontSize: 12, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
    });
});

// ════════════════════════════════════════════════════
// SLIDE 3: Live Platform Data
// ════════════════════════════════════════════════════
let s3 = pptx.addSlide();
s3.background = { fill: BG_DARK };
addSlideHeader(s3, 'Live Platform Dashboard', 'Real data from https://cryptoedge-ai.onrender.com');

const kpis = [
    { icon: 'BTC', label: 'BTC/EUR Price',     value: '\u20AC58,982',  sub: 'Live Kraken',      color: GOLD },
    { icon: 'ETH', label: 'ETH/EUR Price',     value: '\u20AC1,764',   sub: 'Live Kraken',      color: SOFT_BLUE },
    { icon: '%',   label: 'Signal Accuracy',    value: '87.3%',         sub: 'Win Rate',         color: ACCENT },
    { icon: 'SR',  label: 'Sharpe Ratio',       value: '2.4',           sub: 'Risk-Adjusted',    color: LAVENDER },
    { icon: 'Bl',  label: 'Paper Balance',      value: '\u20AC10,000',  sub: 'Starting Capital', color: SOFT_GREEN },
    { icon: 'Sg',  label: 'AI Signals',         value: 'LIVE',          sub: 'BTC SHORT 73% / ETH LONG 82%', color: ACCENT },
];

kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.7 + col * 4.1;
    const y = 1.4 + row * 2.85;

    addCard(s3, x, y, 3.7, 2.5);
    addIcon(s3, x + 0.2, y + 0.2, k.icon, k.color, 0.38);
    s3.addText(k.label, {
        x: x + 0.7, y: y + 0.18, w: 2.7, h: 0.38,
        fontSize: 14, fontFace: FONT_HEADING, bold: true, color: WHITE, valign: 'middle',
    });
    addDivider(s3, x + 0.2, y + 0.7, 3.3, DIVIDER);
    s3.addText(k.sub, {
        x: x + 0.3, y: y + 0.85, w: 1.8, h: 0.3,
        fontSize: 11, fontFace: FONT, color: MID_GRAY,
    });
    s3.addText(k.value, {
        x: x + 1.5, y: y + 1.1, w: 2.0, h: 0.9,
        fontSize: 36, fontFace: FONT_HEADING, bold: true, color: k.color, align: 'right',
    });
});

s3.addText('* Live data from Kraken public API. Paper trading starts with EUR 10,000. Past performance does not guarantee future results.', {
    x: 0.7, y: 6.85, w: 11.93, h: 0.3,
    fontSize: 9, fontFace: FONT, color: MID_GRAY, italic: true,
});

// ════════════════════════════════════════════════════
// SLIDE 4: Technology Stack
// ════════════════════════════════════════════════════
let s4 = pptx.addSlide();
s4.background = { fill: BG_DARK };
addSlideHeader(s4, 'Technology Stack', 'Modern, lightweight, production-ready architecture');

const techStack = [
    { icon: 'JS', title: 'Backend Runtime',   items: 'Node.js v24\nExpress v5 Framework\nRESTful API Design',     color: SOFT_GREEN },
    { icon: 'DB', title: 'Database',          items: 'SQLite (better-sqlite3)\nWAL Journal Mode\nForeign Key Constraints', color: ACCENT },
    { icon: 'Lk', title: 'Authentication',    items: 'JWT Bearer Tokens\nbcrypt Password Hashing\n7-Day Token Expiry',    color: LAVENDER },
    { icon: 'K',  title: 'Exchange API',      items: 'Kraken REST v0\nPublic + Private Endpoints\nHMAC-SHA512 Signing',   color: SOFT_BLUE },
    { icon: 'Sg', title: 'Signal Engine',     items: 'RSI (14-Period)\nMACD (12/26/9)\nBollinger Bands (20,2)',             color: GOLD },
    { icon: '<>', title: 'Frontend',          items: 'Pure HTML / CSS / JS\nWebSocket Client\nResponsive Design',           color: ACCENT },
];

techStack.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.7 + col * 4.1;
    const y = 1.35 + row * 2.85;

    addCard(s4, x, y, 3.7, 2.5, { border: t.color });
    addIcon(s4, x + 1.55, y + 0.2, t.icon, t.color, 0.55);
    s4.addText(t.title, {
        x, y: y + 0.85, w: 3.7, h: 0.35,
        fontSize: 15, fontFace: FONT_HEADING, bold: true, color: t.color, align: 'center',
    });
    addDivider(s4, x + 0.3, y + 1.25, 3.1, DIVIDER);
    s4.addText(t.items, {
        x: x + 0.3, y: y + 1.35, w: 3.1, h: 1.0,
        fontSize: 11, fontFace: FONT, color: LIGHT_GRAY, align: 'center', lineSpacingMultiple: 1.5,
    });
});

// ════════════════════════════════════════════════════
// SLIDE 5: System Architecture
// ════════════════════════════════════════════════════
let s5 = pptx.addSlide();
s5.background = { fill: BG_DARK };
addSlideHeader(s5, 'System Architecture', 'End-to-end data flow from exchange to browser');

// ── Kraken Box ──
addCard(s5, 0.5, 1.5, 3.0, 4.8, { border: SOFT_BLUE });
addIcon(s5, 1.65, 1.7, 'K', SOFT_BLUE, 0.5);
s5.addText('Kraken Exchange', {
    x: 0.5, y: 2.3, w: 3.0, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: SOFT_BLUE, align: 'center',
});
addDivider(s5, 0.8, 2.75, 2.4, DIVIDER);

s5.addText('PUBLIC API  (No Auth)', {
    x: 0.7, y: 2.9, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: FONT, bold: true, color: ACCENT,
});
['Ticker Prices', 'OHLCV Candles', 'Order Book Depth'].forEach((item, i) => {
    s5.addText('\u2022  ' + item, {
        x: 0.9, y: 3.2 + i * 0.33, w: 2.2, h: 0.3,
        fontSize: 10, fontFace: FONT, color: LIGHT_GRAY,
    });
});

addDivider(s5, 0.8, 4.25, 2.4, DIVIDER);
s5.addText('PRIVATE API  (Key Required)', {
    x: 0.7, y: 4.4, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: FONT, bold: true, color: GOLD,
});
['Place Orders', 'Account Balance', 'Cancel Orders'].forEach((item, i) => {
    s5.addText('\u2022  ' + item, {
        x: 0.9, y: 4.7 + i * 0.33, w: 2.2, h: 0.3,
        fontSize: 10, fontFace: FONT, color: LIGHT_GRAY,
    });
});

// ── Arrow 1 ──
s5.addShape(pptx.ShapeType.rect, { x: 3.55, y: 3.7, w: 0.7, h: 0.03, fill: { type: 'solid', color: ACCENT } });
s5.addText('\u25B6', { x: 3.95, y: 3.5, w: 0.4, h: 0.4, fontSize: 14, color: ACCENT, align: 'center', valign: 'middle' });
s5.addText('HTTPS', { x: 3.5, y: 3.95, w: 0.8, h: 0.25, fontSize: 8, fontFace: FONT, color: MID_GRAY, align: 'center' });

// ── Server Box ──
addCard(s5, 4.3, 1.5, 4.8, 4.8, { border: ACCENT });
addIcon(s5, 6.35, 1.7, 'S', ACCENT, 0.5);
s5.addText('Node.js Server', {
    x: 4.3, y: 2.3, w: 4.8, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: ACCENT, align: 'center',
});
addDivider(s5, 4.6, 2.75, 4.2, DIVIDER);

const serverModules = [
    { name: 'Price Feed',     sub: 'Every 15s',    color: SOFT_BLUE },
    { name: 'Signal Engine',  sub: 'RSI/MACD/BB',  color: GOLD },
    { name: 'Paper Trading',  sub: 'Open / Close',  color: SOFT_GREEN },
    { name: 'Auth Service',   sub: 'JWT / bcrypt',  color: LAVENDER },
];
serverModules.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = 4.6 + col * 2.25;
    const my = 2.95 + row * 1.45;
    addCard(s5, mx, my, 2.0, 1.15, { fill: BG_DARK, border: m.color });
    s5.addText(m.name, {
        x: mx, y: my + 0.15, w: 2.0, h: 0.35,
        fontSize: 11, fontFace: FONT, bold: true, color: m.color, align: 'center',
    });
    s5.addText(m.sub, {
        x: mx, y: my + 0.55, w: 2.0, h: 0.3,
        fontSize: 9, fontFace: FONT, color: MID_GRAY, align: 'center',
    });
});

// SQLite below
addCard(s5, 5.15, 5.85, 3.3, 0.55, { fill: BG_DARK, border: MID_GRAY });
addIcon(s5, 5.3, 5.92, 'DB', MID_GRAY, 0.3);
s5.addText('SQLite  (users, trades, signals, prices)', {
    x: 5.7, y: 5.85, w: 2.6, h: 0.55,
    fontSize: 9, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
});
s5.addText('\u25BC', { x: 6.4, y: 5.55, w: 0.4, h: 0.3, fontSize: 12, color: MID_GRAY, align: 'center' });

// ── Arrow 2 ──
s5.addShape(pptx.ShapeType.rect, { x: 9.15, y: 3.7, w: 0.7, h: 0.03, fill: { type: 'solid', color: SOFT_GREEN } });
s5.addText('\u25B6', { x: 9.55, y: 3.5, w: 0.4, h: 0.4, fontSize: 14, color: SOFT_GREEN, align: 'center', valign: 'middle' });
s5.addText('REST + WS', { x: 9.05, y: 3.95, w: 0.9, h: 0.25, fontSize: 8, fontFace: FONT, color: MID_GRAY, align: 'center' });

// ── Browser Box ──
addCard(s5, 9.9, 1.5, 3.0, 4.8, { border: SOFT_GREEN });
addIcon(s5, 11.05, 1.7, 'Br', SOFT_GREEN, 0.5);
s5.addText('Browser', {
    x: 9.9, y: 2.3, w: 3.0, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: SOFT_GREEN, align: 'center',
});
addDivider(s5, 10.2, 2.75, 2.4, DIVIDER);

s5.addText('LANDING PAGE', {
    x: 10.1, y: 2.9, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: FONT, bold: true, color: ACCENT,
});
['Hero & Animations', 'Login / Signup Modals', 'Backtest Results'].forEach((item, i) => {
    s5.addText('\u2022  ' + item, {
        x: 10.3, y: 3.2 + i * 0.33, w: 2.2, h: 0.3,
        fontSize: 10, fontFace: FONT, color: LIGHT_GRAY,
    });
});

addDivider(s5, 10.2, 4.25, 2.4, DIVIDER);
s5.addText('DASHBOARD', {
    x: 10.1, y: 4.4, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: FONT, bold: true, color: SOFT_GREEN,
});
['Live Prices (WebSocket)', 'AI Signal Cards', 'Trade Panel & P&L'].forEach((item, i) => {
    s5.addText('\u2022  ' + item, {
        x: 10.3, y: 4.7 + i * 0.33, w: 2.2, h: 0.3,
        fontSize: 10, fontFace: FONT, color: LIGHT_GRAY,
    });
});

// ════════════════════════════════════════════════════
// SLIDE 6: How It Works
// ════════════════════════════════════════════════════
let s6 = pptx.addSlide();
s6.background = { fill: BG_DARK };
addSlideHeader(s6, 'How It Works', 'From raw market data to executed trade in four steps');

const steps = [
    { num: '01', title: 'Ingest Data',     desc: 'Pull historical and live OHLCV candle data from Kraken every 15 seconds for BTC/EUR and ETH/EUR pairs.',         color: SOFT_BLUE },
    { num: '02', title: 'AI Analysis',     desc: 'Calculate RSI, MACD, and Bollinger Bands from 720 data points. Score each indicator for bullish or bearish bias.', color: GOLD },
    { num: '03', title: 'Generate Signal', desc: 'Output a LONG, SHORT, or HOLD signal with a confidence percentage. Store in database and broadcast via WebSocket.', color: ACCENT },
    { num: '04', title: 'Execute Trade',   desc: 'Paper mode: simulate trade at real price. Live mode: auto-execute on Kraken with stop-loss and take-profit levels.', color: SOFT_GREEN },
];

steps.forEach((st, i) => {
    const x = 0.5 + i * 3.15;
    addCard(s6, x, 1.5, 2.85, 5.0);

    // Number circle at top - bordered style matching website
    s6.addShape(pptx.ShapeType.ellipse, {
        x: x + 0.95, y: 1.75, w: 0.9, h: 0.9,
        fill: { type: 'solid', color: BG_DARK },
        line: { color: st.color, width: 2 },
    });
    s6.addText(st.num, {
        x: x + 0.95, y: 1.75, w: 0.9, h: 0.9,
        fontSize: 22, fontFace: FONT_HEADING, bold: true, color: st.color, align: 'center', valign: 'middle',
    });

    // Title
    s6.addText(st.title, {
        x: x + 0.15, y: 2.85, w: 2.55, h: 0.4,
        fontSize: 17, fontFace: FONT_HEADING, bold: true, color: st.color, align: 'center',
    });

    addDivider(s6, x + 0.3, 3.35, 2.25, DIVIDER);

    // Description
    s6.addText(st.desc, {
        x: x + 0.25, y: 3.55, w: 2.35, h: 2.4,
        fontSize: 11.5, fontFace: FONT, color: LIGHT_GRAY, align: 'center', lineSpacingMultiple: 1.6,
    });

    // Arrow between cards
    if (i < 3) {
        s6.addText('\u25B6', {
            x: x + 2.75, y: 3.6, w: 0.5, h: 0.4,
            fontSize: 14, color: MID_GRAY, align: 'center', valign: 'middle',
        });
    }
});

// ════════════════════════════════════════════════════
// SLIDE 7: Core Features
// ════════════════════════════════════════════════════
let s7 = pptx.addSlide();
s7.background = { fill: BG_DARK };
addSlideHeader(s7, 'Core Features', 'Everything needed for intelligent crypto trading');

const features = [
    { icon: 'Nn', title: 'Neural Network Design',  desc: 'Signal engine using RSI, MACD, Bollinger Bands with weighted scoring to identify market conditions.',       color: ACCENT },
    { icon: 'TA', title: 'Technical Analysis',      desc: 'Automated calculation of moving averages, momentum oscillators, volatility bands, and volume metrics.',     color: SOFT_GREEN },
    { icon: 'K',  title: 'Kraken Integration',      desc: 'Direct REST API connection. Public endpoints for data (free), Private endpoints for order execution.',      color: SOFT_BLUE },
    { icon: 'Rm', title: 'Risk Management',         desc: 'Stop-loss and take-profit on every trade. Position sizing based on balance. Max drawdown controls.',        color: CORAL },
    { icon: 'Pt', title: 'Paper Trading',           desc: 'Simulated trading with real Kraken prices. Starting balance EUR 10,000. Full P&L tracking and history.',    color: GOLD },
    { icon: 'Ws', title: 'Real-Time WebSocket',     desc: 'Live price updates every 15 seconds. Instant signal broadcasts. Auto-reconnect on disconnection.',         color: LAVENDER },
];

features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.7 + col * 6.3;
    const y = 1.35 + row * 1.8;

    addCard(s7, x, y, 5.9, 1.5);

    // Icon
    addIcon(s7, x + 0.2, y + 0.25, f.icon, f.color, 0.42);

    // Title
    s7.addText(f.title, {
        x: x + 0.8, y: y + 0.15, w: 4.8, h: 0.35,
        fontSize: 14, fontFace: FONT_HEADING, bold: true, color: f.color,
    });

    // Divider
    addDivider(s7, x + 0.8, y + 0.55, 4.8, DIVIDER);

    // Description
    s7.addText(f.desc, {
        x: x + 0.8, y: y + 0.65, w: 4.8, h: 0.7,
        fontSize: 11, fontFace: FONT, color: LIGHT_GRAY, lineSpacingMultiple: 1.5,
    });
});

// ════════════════════════════════════════════════════
// SLIDE 8: API Endpoints
// ════════════════════════════════════════════════════
let s8 = pptx.addSlide();
s8.background = { fill: BG_DARK };
addSlideHeader(s8, 'API Endpoints', '12 RESTful endpoints + 1 WebSocket connection');

addCard(s8, 0.7, 1.3, 11.93, 5.7);

const endpoints = [
    { method: 'POST',   path: '/api/auth/register',       desc: 'Create new user account',       auth: 'Public' },
    { method: 'POST',   path: '/api/auth/login',           desc: 'Authenticate and receive JWT',  auth: 'Public' },
    { method: 'GET',    path: '/api/auth/me',              desc: 'Get current user profile',       auth: 'Protected' },
    { method: 'GET',    path: '/api/market/ticker',        desc: 'Live prices from Kraken',        auth: 'Public' },
    { method: 'GET',    path: '/api/market/ohlcv/:pair',   desc: 'Historical candlestick data',    auth: 'Public' },
    { method: 'GET',    path: '/api/market/orderbook/:pair',desc: 'Order book bid/ask depth',      auth: 'Public' },
    { method: 'POST',   path: '/api/trade/open',           desc: 'Open a paper trading position',  auth: 'Protected' },
    { method: 'POST',   path: '/api/trade/close/:id',      desc: 'Close position and realize P&L', auth: 'Protected' },
    { method: 'GET',    path: '/api/trade/positions',      desc: 'List all open positions',         auth: 'Protected' },
    { method: 'GET',    path: '/api/portfolio/summary',    desc: 'Balance, P&L, win rate stats',    auth: 'Protected' },
    { method: 'GET',    path: '/api/signals/latest',       desc: 'Latest AI trading signals',       auth: 'Public' },
    { method: 'WS',     path: '/ws',                       desc: 'Real-time price and signal stream',auth: 'Public' },
];

// Table header
const colDefs = [
    { text: 'METHOD',      x: 1.0,  w: 1.1 },
    { text: 'ENDPOINT',    x: 2.1,  w: 3.8 },
    { text: 'DESCRIPTION', x: 5.9,  w: 4.2 },
    { text: 'ACCESS',      x: 10.1, w: 2.2 },
];
colDefs.forEach(c => {
    s8.addText(c.text, {
        x: c.x, y: 1.45, w: c.w, h: 0.35,
        fontSize: 9, fontFace: FONT, bold: true, color: MID_GRAY, letterSpacing: 1,
    });
});
addDivider(s8, 1.0, 1.82, 11.3, DIVIDER);

endpoints.forEach((ep, i) => {
    const y = 1.9 + i * 0.42;
    const methodColors = { POST: SOFT_GREEN, GET: SOFT_BLUE, WS: LAVENDER, DELETE: CORAL };
    const mColor = methodColors[ep.method] || ACCENT;
    // Method badge
    s8.addShape(pptx.ShapeType.roundRect, {
        x: 1.0, y: y + 0.04, w: 0.7, h: 0.28,
        fill: { type: 'solid', color: mColor }, rectRadius: 0.04, transparency: 80,
    });
    s8.addText(ep.method, {
        x: 1.0, y: y, w: 0.7, h: 0.35,
        fontSize: 9, fontFace: FONT, bold: true, color: mColor, align: 'center', valign: 'middle',
    });
    s8.addText(ep.path, {
        x: 2.1, y: y, w: 3.8, h: 0.35,
        fontSize: 10, fontFace: 'Courier New', color: WHITE, valign: 'middle',
    });
    s8.addText(ep.desc, {
        x: 5.9, y: y, w: 4.2, h: 0.35,
        fontSize: 10, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
    });
    const accessColor = ep.auth === 'Protected' ? GOLD : ACCENT;
    s8.addText(ep.auth, {
        x: 10.1, y: y, w: 2.2, h: 0.35,
        fontSize: 10, fontFace: FONT, color: accessColor, align: 'center', valign: 'middle',
    });

    if (i < endpoints.length - 1) {
        addDivider(s8, 1.0, y + 0.38, 11.3, '1A2828');
    }
});

// ════════════════════════════════════════════════════
// SLIDE 9: Database Schema
// ════════════════════════════════════════════════════
let s9 = pptx.addSlide();
s9.background = { fill: BG_DARK };
addSlideHeader(s9, 'Database Schema', 'SQLite with WAL mode and foreign key constraints');

const tables = [
    {
        name: 'users', color: SOFT_BLUE, icon: 'U',
        fields: 'id          INTEGER   PRIMARY KEY\nname        TEXT      NOT NULL\nemail       TEXT      UNIQUE\npassword_hash TEXT\nexchange_pref TEXT    DEFAULT kraken\ntrading_mode  TEXT    DEFAULT paper\nbalance     REAL      DEFAULT 10000\ncreated_at  DATETIME',
    },
    {
        name: 'trades', color: SOFT_GREEN, icon: 'Tr',
        fields: 'id          INTEGER   PRIMARY KEY\nuser_id     INTEGER   FK -> users\npair        TEXT      BTC/EUR, ETH/EUR\ndirection   TEXT      long | short\nentry_price REAL\nexit_price  REAL\nquantity    REAL\nstop_loss   REAL\nstatus      TEXT      open | closed\npnl         REAL',
    },
    {
        name: 'signals', color: GOLD, icon: 'Sg',
        fields: 'id          INTEGER   PRIMARY KEY\npair        TEXT\ndirection   TEXT      long | short | hold\nconfidence  REAL      percentage\nprice_at_signal REAL\nrsi         REAL\nmacd        REAL\nmacd_signal REAL\nbb_upper    REAL\nbb_lower    REAL',
    },
    {
        name: 'price_cache', color: ACCENT, icon: 'Pc',
        fields: 'id          INTEGER   PRIMARY KEY\npair        TEXT\nprice       REAL\nvolume_24h  REAL\nhigh_24h    REAL\nlow_24h     REAL\nchange_24h  REAL\nfetched_at  DATETIME',
    },
];

tables.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.7 + col * 6.3;
    const y = 1.3 + row * 2.95;

    addCard(s9, x, y, 5.9, 2.65, { border: t.color });
    addIcon(s9, x + 0.2, y + 0.15, t.icon, t.color, 0.36);
    s9.addText(t.name, {
        x: x + 0.65, y: y + 0.12, w: 3.0, h: 0.38,
        fontSize: 15, fontFace: 'Courier New', bold: true, color: t.color, valign: 'middle',
    });
    addDivider(s9, x + 0.2, y + 0.6, 5.5, DIVIDER);
    s9.addText(t.fields, {
        x: x + 0.3, y: y + 0.7, w: 5.3, h: 1.8,
        fontSize: 9, fontFace: 'Courier New', color: LIGHT_GRAY, lineSpacingMultiple: 1.2,
    });
});

// ════════════════════════════════════════════════════
// SLIDE 10: Security & Configuration
// ════════════════════════════════════════════════════
let s10 = pptx.addSlide();
s10.background = { fill: BG_DARK };
addSlideHeader(s10, 'Security & Configuration', 'Production-ready security controls and environment setup');

// Security panel
addCard(s10, 0.7, 1.3, 5.9, 5.7, { border: ACCENT });
addIcon(s10, 0.95, 1.5, 'Lk', ACCENT, 0.4);
s10.addText('Security Controls', {
    x: 1.5, y: 1.45, w: 4.0, h: 0.4,
    fontSize: 18, fontFace: FONT_HEADING, bold: true, color: ACCENT,
});
addDivider(s10, 0.95, 2.0, 5.4, DIVIDER);

const secItems = [
    { title: 'Password Hashing',     desc: 'bcrypt with configurable salt rounds (10)',    color: SOFT_GREEN },
    { title: 'JWT Authentication',   desc: 'HS256 signed tokens with 7-day expiry',        color: SOFT_BLUE },
    { title: 'Route Protection',     desc: 'Bearer token middleware on all private routes', color: LAVENDER },
    { title: 'Live Trading Gate',    desc: 'Environment flag must be explicitly enabled',   color: GOLD },
    { title: 'API Key Isolation',    desc: 'Kraken credentials in .env, never sent to client', color: CORAL },
    { title: 'Input Validation',     desc: 'Direction, quantity, and pair checks on all trades', color: ACCENT },
    { title: 'Version Control',      desc: '.env, node_modules, and database in .gitignore',    color: MID_GRAY },
];
secItems.forEach((s, i) => {
    const y = 2.2 + i * 0.63;
    addIcon(s10, 1.05, y + 0.05, '\u2713', s.color, 0.24);
    s10.addText(s.title, {
        x: 1.4, y: y, w: 2.5, h: 0.3,
        fontSize: 11, fontFace: FONT, bold: true, color: WHITE,
    });
    s10.addText(s.desc, {
        x: 1.4, y: y + 0.28, w: 4.8, h: 0.25,
        fontSize: 10, fontFace: FONT, color: MID_GRAY,
    });
});

// Configuration panel
addCard(s10, 7.0, 1.3, 5.63, 5.7, { border: GOLD });
addIcon(s10, 7.25, 1.5, 'Cf', GOLD, 0.4);
s10.addText('Environment Config', {
    x: 7.8, y: 1.45, w: 4.0, h: 0.4,
    fontSize: 18, fontFace: FONT_HEADING, bold: true, color: GOLD,
});
addDivider(s10, 7.25, 2.0, 5.1, DIVIDER);

s10.addText('.env', {
    x: 7.3, y: 2.15, w: 1.0, h: 0.3,
    fontSize: 12, fontFace: 'Courier New', bold: true, color: GOLD,
});

const envLines = [
    { k: 'PORT',                v: '10000',                   c: MID_GRAY },
    { k: 'JWT_SECRET',          v: '<auto-generated>',        c: MID_GRAY },
    { k: 'DB_PATH',             v: '/opt/render/project/data/cryptoedge.db', c: MID_GRAY },
    { k: '',                    v: '',                         c: MID_GRAY },
    { k: '# Kraken Public',    v: '(free, no auth)',          c: ACCENT },
    { k: 'KRAKEN_API_URL',     v: 'https://api.kraken.com',  c: MID_GRAY },
    { k: '',                    v: '',                         c: MID_GRAY },
    { k: '# Kraken Private',   v: '(optional)',               c: GOLD },
    { k: 'KRAKEN_API_KEY',     v: '',                         c: MID_GRAY },
    { k: 'KRAKEN_API_SECRET',  v: '',                         c: MID_GRAY },
    { k: 'LIVE_TRADING_ENABLED',v: 'false',                   c: CORAL },
    { k: '',                    v: '',                         c: MID_GRAY },
    { k: 'SIGNAL_INTERVAL',    v: '60000',                    c: MID_GRAY },
];
envLines.forEach((line, i) => {
    const y = 2.55 + i * 0.33;
    if (line.k.startsWith('#')) {
        s10.addText(line.k + '  ' + line.v, {
            x: 7.4, y, w: 5.0, h: 0.3,
            fontSize: 10, fontFace: 'Courier New', color: line.c, italic: true,
        });
    } else if (line.k) {
        s10.addText(line.k + '=' + line.v, {
            x: 7.4, y, w: 5.0, h: 0.3,
            fontSize: 10, fontFace: 'Courier New', color: LIGHT_GRAY,
        });
    }
});

// ════════════════════════════════════════════════════
// SLIDE 11: Project Structure
// ════════════════════════════════════════════════════
let s11 = pptx.addSlide();
s11.background = { fill: BG_DARK };
addSlideHeader(s11, 'Project Structure', '18 files across a clean, modular architecture');

// File tree
addCard(s11, 0.7, 1.3, 6.4, 5.7);
s11.addText('File Tree', {
    x: 1.0, y: 1.45, w: 3.0, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: WHITE,
});
addDivider(s11, 1.0, 1.85, 5.8, DIVIDER);

s11.addText(
    'cryptoedge-ai/\n' +
    '\u251C\u2500 server.js                   Entry point\n' +
    '\u251C\u2500 package.json\n' +
    '\u251C\u2500 .env                        Configuration\n' +
    '\u251C\u2500 render.yaml                 Render deploy\n' +
    '\u251C\u2500 public/\n' +
    '\u2502   \u251C\u2500 index.html              Landing page\n' +
    '\u2502   \u2514\u2500 dashboard.html          Trading dashboard\n' +
    '\u251C\u2500 server/\n' +
    '\u2502   \u251C\u2500 db/init.js              Schema & init\n' +
    '\u2502   \u251C\u2500 middleware/auth.js       JWT middleware\n' +
    '\u2502   \u251C\u2500 routes/\n' +
    '\u2502   \u2502   \u251C\u2500 auth.js             Register / Login\n' +
    '\u2502   \u2502   \u251C\u2500 market.js           Kraken data\n' +
    '\u2502   \u2502   \u251C\u2500 trade.js            Paper trading\n' +
    '\u2502   \u2502   \u251C\u2500 portfolio.js        Summary\n' +
    '\u2502   \u2502   \u251C\u2500 signals.js          AI signals\n' +
    '\u2502   \u2502   \u2514\u2500 krakenLive.js       Live trading\n' +
    '\u2502   \u2514\u2500 services/\n' +
    '\u2502       \u251C\u2500 kraken.js           API client\n' +
    '\u2502       \u251C\u2500 indicators.js       RSI / MACD / BB\n' +
    '\u2502       \u251C\u2500 signals.js          Signal engine\n' +
    '\u2502       \u251C\u2500 paperTrading.js     Trade engine\n' +
    '\u2502       \u251C\u2500 priceFeed.js        Price broadcaster\n' +
    '\u2502       \u2514\u2500 websocket.js        WS server\n' +
    '\u2514\u2500 data/cryptoedge.db              SQLite database', {
    x: 1.0, y: 1.95, w: 5.9, h: 4.8,
    fontSize: 9.5, fontFace: 'Courier New', color: LIGHT_GRAY, lineSpacingMultiple: 1.15,
});

// Stats cards
addCard(s11, 7.5, 1.3, 5.13, 2.3);
addIcon(s11, 7.75, 1.5, '#', ACCENT, 0.36);
s11.addText('Project Stats', {
    x: 8.2, y: 1.45, w: 3.0, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: WHITE,
});
addDivider(s11, 7.75, 1.9, 4.6, DIVIDER);

const pStats = [
    { label: 'Total Source Files', value: '18',  color: ACCENT },
    { label: 'Backend Modules',    value: '12',  color: SOFT_GREEN },
    { label: 'Frontend Pages',     value: '2',   color: SOFT_BLUE },
    { label: 'API Endpoints',      value: '12',  color: GOLD },
    { label: 'Database Tables',    value: '4',   color: LAVENDER },
];
pStats.forEach((ps, i) => {
    s11.addText(ps.label, {
        x: 7.85, y: 2.0 + i * 0.32, w: 3.2, h: 0.3,
        fontSize: 11, fontFace: FONT, color: LIGHT_GRAY,
    });
    s11.addText(ps.value, {
        x: 11.0, y: 2.0 + i * 0.32, w: 1.3, h: 0.3,
        fontSize: 11, fontFace: FONT, bold: true, color: ps.color, align: 'right',
    });
});

// Quick start
addCard(s11, 7.5, 3.9, 5.13, 3.1, { border: SOFT_GREEN });
addIcon(s11, 7.75, 4.1, '>', SOFT_GREEN, 0.36);
s11.addText('Quick Start', {
    x: 8.2, y: 4.05, w: 3.0, h: 0.35,
    fontSize: 14, fontFace: FONT_HEADING, bold: true, color: SOFT_GREEN,
});
addDivider(s11, 7.75, 4.5, 4.6, DIVIDER);

s11.addText(
    '# Clone and install\n' +
    'npm install\n' +
    '\n' +
    '# Start the server\n' +
    'npm start\n' +
    '\n' +
    '# Live production\n' +
    'https://cryptoedge-ai.onrender.com', {
    x: 7.85, y: 4.6, w: 4.5, h: 2.2,
    fontSize: 11, fontFace: 'Courier New', color: LIGHT_GRAY, lineSpacingMultiple: 1.3,
});

// ════════════════════════════════════════════════════
// SLIDE 12: Roadmap
// ════════════════════════════════════════════════════
let s12 = pptx.addSlide();
s12.background = { fill: BG_DARK };
addSlideHeader(s12, 'Development Roadmap', 'Phased delivery from MVP to production');

const phases = [
    {
        title: 'Phase 1', subtitle: 'Foundation', status: 'COMPLETE', statusColor: SOFT_GREEN,
        items: ['Express v5 server', 'SQLite database', 'JWT authentication', 'Kraken public API', 'Paper trading engine', 'AI signal generator', 'WebSocket updates', 'Trading dashboard', 'Responsive landing page'],
    },
    {
        title: 'Phase 2', subtitle: 'Expansion', status: 'PLANNED', statusColor: SOFT_BLUE,
        items: ['Binance API integration', 'TradingView charting', 'Email / SMS alerts', 'Historical P&L graphs', 'Multi-currency pairs', 'User settings page'],
    },
    {
        title: 'Phase 3', subtitle: 'Intelligence', status: 'FUTURE', statusColor: LAVENDER,
        items: ['LSTM neural network', 'Sentiment analysis', 'Portfolio optimization', 'Mobile application', 'Social leaderboard', 'Backtesting UI'],
    },
];

phases.forEach((p, i) => {
    const x = 0.5 + i * 4.2;
    addCard(s12, x, 1.35, 3.85, 5.65, { border: p.statusColor });

    s12.addText(p.title, {
        x, y: 1.55, w: 3.85, h: 0.35,
        fontSize: 20, fontFace: FONT_HEADING, color: WHITE, align: 'center',
    });
    s12.addText(p.subtitle, {
        x, y: 1.9, w: 3.85, h: 0.3,
        fontSize: 12, fontFace: FONT, color: MID_GRAY, align: 'center',
    });

    // Status badge
    s12.addShape(pptx.ShapeType.roundRect, {
        x: x + 1.2, y: 2.3, w: 1.45, h: 0.35,
        fill: { type: 'solid', color: p.statusColor },
        rectRadius: 0.05, transparency: 80,
    });
    s12.addText(p.status, {
        x: x + 1.2, y: 2.3, w: 1.45, h: 0.35,
        fontSize: 9, fontFace: FONT, bold: true, color: p.statusColor, align: 'center', valign: 'middle',
    });

    addDivider(s12, x + 0.3, 2.8, 3.25, DIVIDER);

    p.items.forEach((item, j) => {
        addIcon(s12, x + 0.35, 2.98 + j * 0.45, i === 0 ? '\u2713' : '\u2022', i === 0 ? SOFT_GREEN : MID_GRAY, 0.2);
        s12.addText(item, {
            x: x + 0.65, y: 2.93 + j * 0.45, w: 2.9, h: 0.38,
            fontSize: 11, fontFace: FONT, color: LIGHT_GRAY, valign: 'middle',
        });
    });
});

// ════════════════════════════════════════════════════
// SLIDE 13: Closing
// ════════════════════════════════════════════════════
let s13 = pptx.addSlide();
s13.background = { fill: BG_DARK };
s13.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.05, fill: { type: 'solid', color: ACCENT } });

// Center card
addCard(s13, 2.5, 1.3, 8.33, 4.8, { border: ACCENT });

// Serif logo like the website
s13.addText('CryptoEdge.', {
    x: 2.5, y: 1.8, w: 8.33, h: 1.0,
    fontSize: 48, fontFace: FONT_HEADING, color: WHITE, align: 'center',
});

s13.addText('AI-Powered Cryptocurrency Trading Platform', {
    x: 2.5, y: 2.9, w: 8.33, h: 0.7,
    fontSize: 18, fontFace: FONT_HEADING, color: WHITE, align: 'center',
});

s13.addText('Trade Smarter with AI-Driven Crypto Signals', {
    x: 2.5, y: 3.6, w: 8.33, h: 0.45,
    fontSize: 16, fontFace: FONT, color: ACCENT, align: 'center',
});

addDivider(s13, 4.5, 4.3, 4.33, DIVIDER);

s13.addText('Thank you', {
    x: 2.5, y: 4.45, w: 8.33, h: 0.45,
    fontSize: 14, fontFace: FONT_HEADING, color: LIGHT_GRAY, align: 'center',
});

s13.addText('https://cryptoedge-ai.onrender.com', {
    x: 2.5, y: 5.0, w: 8.33, h: 0.4,
    fontSize: 15, fontFace: 'Courier New', color: ACCENT, align: 'center',
});

// Disclaimer at bottom
s13.addText('Trading cryptocurrencies involves significant risk. Past performance does not guarantee future returns. This platform is for educational and informational purposes only.', {
    x: 1.5, y: 6.6, w: 10.33, h: 0.4,
    fontSize: 9, fontFace: FONT, color: MID_GRAY, align: 'center', italic: true,
});

// ════════════════════════════════════════════════════
// SAVE
// ════════════════════════════════════════════════════
const outputPath = '/Users/swatantrasohni/Downloads/cryptoedge-ai-master/CryptoEdge_AI_Presentation.pptx';
pptx.writeFile({ fileName: outputPath })
    .then(() => console.log('Presentation saved: ' + outputPath))
    .catch(err => console.error('Error:', err));
