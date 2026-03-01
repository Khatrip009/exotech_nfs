const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';
const DATABASE_FILE = process.env.DB_FILE || path.join(__dirname, 'data.sqlite');

async function initDb() {
  const db = await open({ filename: DATABASE_FILE, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      color TEXT DEFAULT '#000000',
      frame TEXT DEFAULT 'none',
      design TEXT DEFAULT 'plain',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  return db;
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

(async () => {
  const db = await initDb();
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);
      const userId = result.lastID;
      const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Email already registered' });
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/me', authMiddleware, async (req, res) => {
    const user = await db.get('SELECT id, email, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
  });

  app.post('/api/codes', authMiddleware, async (req, res) => {
    const { color, frame, design, code } = req.body;
    const codeValue = code && String(code).trim() ? String(code).trim() : uuidv4().slice(0, 8).toUpperCase();
    const id = uuidv4();
    try {
      await db.run(
        'INSERT INTO codes (id, user_id, code, color, frame, design) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.id, codeValue, color || '#000000', frame || 'none', design || 'plain']
      );
      const saved = await db.get('SELECT * FROM codes WHERE id = ?', [id]);
      res.json({ code: saved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/codes', authMiddleware, async (req, res) => {
    try {
      const codes = await db.all('SELECT * FROM codes WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
      res.json({ codes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/codes/:id', authMiddleware, async (req, res) => {
    try {
      await db.run('DELETE FROM codes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Serve static frontend
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
})();
