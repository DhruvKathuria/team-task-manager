const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../config/database');
const { authenticateToken, requireProjectAccess } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const projects = dbAll(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
    FROM projects p JOIN users u ON p.owner_id = u.id
    WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
    ORDER BY p.created_at DESC
  `, [req.user.id, req.user.id]);
  res.json({ projects });
});

router.get('/:projectId', authenticateToken, requireProjectAccess, (req, res) => {
  const members = dbAll(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?
  `, [req.params.projectId]);
  res.json({ project: req.project, members });
});

router.post('/', authenticateToken, [body('name').trim().notEmpty()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  try {
    const result = dbRun('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', [name, description || '', req.user.id]);
    dbRun('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [result.lastInsertRowid, req.user.id, 'admin']);
    const project = dbGet('SELECT * FROM projects WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Project created', project });
  } catch (err) { res.status(500).json({ error: 'Failed to create project' }); }
});

router.put('/:projectId', authenticateToken, requireProjectAccess, (req, res) => {
  if (req.project.owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only project owner can update' });
  const { name, description, status } = req.body;
  const c = req.project;
  dbRun('UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?',
    [name || c.name, description ?? c.description, status || c.status, req.params.projectId]);
  res.json({ message: 'Project updated', project: dbGet('SELECT * FROM projects WHERE id = ?', [req.params.projectId]) });
});

router.delete('/:projectId', authenticateToken, requireProjectAccess, (req, res) => {
  if (req.project.owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only owner can delete' });
  dbRun('DELETE FROM projects WHERE id = ?', [req.params.projectId]);
  res.json({ message: 'Project deleted' });
});

router.post('/:projectId/members', authenticateToken, requireProjectAccess, [
  body('user_id').isInt(), body('role').optional().isIn(['admin','member'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (req.project.owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admin can add members' });
  const { user_id, role = 'member' } = req.body;
  try {
    const existing = dbGet('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.projectId, user_id]);
    if (!existing) dbRun('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [req.params.projectId, user_id, role]);
    res.json({ message: 'Member added' });
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:projectId/members/:userId', authenticateToken, requireProjectAccess, (req, res) => {
  if (req.project.owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admin can remove members' });
  dbRun('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.projectId, req.params.userId]);
  res.json({ message: 'Member removed' });
});

module.exports = router;
