require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDbAsync } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Initialize DB first, then load routes
getDbAsync().then(() => {
  const authRoutes = require('./routes/auth');
  const projectRoutes = require('./routes/projects');
  const taskRoutes = require('./routes/tasks');

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

  app.listen(PORT, () => {
    console.log(`\n🚀 TaskFlow API → http://localhost:${PORT}`);
    console.log(`📋 Auth:     POST /api/auth/signup | POST /api/auth/login`);
    console.log(`📁 Projects: GET/POST /api/projects | GET/PUT/DELETE /api/projects/:id`);
    console.log(`✅ Tasks:    GET /api/tasks/dashboard | POST /api/tasks\n`);
  });
}).catch(err => { console.error('Failed to init DB:', err); process.exit(1); });

module.exports = app;
