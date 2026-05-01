const jwt = require('jsonwebtoken');
const { dbGet } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'task_manager_secret_2024';

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = dbGet('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.body.project_id;
  if (!projectId) return res.status(400).json({ error: 'Project ID required' });
  const project = dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const member = dbGet('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
  if (!member && project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No access to this project' });
  }
  req.project = project;
  req.projectMember = member;
  next();
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticateToken, requireProjectAccess, generateToken };
