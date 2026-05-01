const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role = 'member' } = req.body;
  try {
    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = dbRun('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
    const user = dbGet('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    const token = generateToken(user.id);
    res.status(201).json({ message: 'Account created', user, token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const user = dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user.id);
    const { password: _, ...userSafe } = user;
    res.json({ message: 'Login successful', user: userSafe, token });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticateToken, (req, res) => res.json({ user: req.user }));

router.get('/users', authenticateToken, (req, res) => {
  const users = dbAll('SELECT id, name, email, role FROM users ORDER BY name');
  res.json({ users });
});

module.exports = router;
