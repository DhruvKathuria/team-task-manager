const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../config/database');
const { authenticateToken, requireProjectAccess } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', authenticateToken, (req, res) => {
  const uid = req.user.id;
  const myTasks = dbAll(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.assigned_to = ? ORDER BY t.due_date ASC
  `, [uid]);
  const overdueTasks = dbAll(`
    SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.assigned_to = ? AND t.status != 'done' AND t.due_date < datetime('now')
  `, [uid]);
  const statsRow = dbAll(`SELECT status, COUNT(*) as cnt FROM tasks WHERE assigned_to = ? GROUP BY status`, [uid]);
  const stats = { total: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
  statsRow.forEach(r => { stats[r.status] = r.cnt; stats.total += r.cnt; });
  const pcRow = dbAll(`
    SELECT COUNT(DISTINCT p.id) as count FROM projects p
    WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
  `, [uid, uid]);
  const projectCount = pcRow[0]?.count || 0;
  res.json({ myTasks, overdueTasks, stats, projectCount });
});

router.get('/project/:projectId', authenticateToken, requireProjectAccess, (req, res) => {
  const { status, priority, assigned_to } = req.query;
  let query = `
    SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id WHERE t.project_id = ?`;
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assigned_to) { query += ' AND t.assigned_to = ?'; params.push(assigned_to); }
  query += ' ORDER BY t.created_at DESC';
  res.json({ tasks: dbAll(query, params) });
});

router.get('/:id', authenticateToken, (req, res) => {
  const task = dbGet(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name, p.name as project_name
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?`, [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

router.post('/', authenticateToken, [
  body('title').trim().notEmpty(),
  body('project_id').isInt(),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;
  try {
    const result = dbRun(`
      INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description||'', project_id, assigned_to||null, req.user.id, status||'todo', priority||'medium', due_date||null]);
    const task = dbGet(`
      SELECT t.*, u.name as assignee_name, c.name as creator_name
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id WHERE t.id = ?`, [result.lastInsertRowid]);
    res.status(201).json({ message: 'Task created', task });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Failed to create task' }); }
});

router.put('/:id', authenticateToken, (req, res) => {
  const task = dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, description, assigned_to, status, priority, due_date } = req.body;
  dbRun(`UPDATE tasks SET title=?, description=?, assigned_to=?, status=?, priority=?, due_date=?,
    updated_at=datetime('now') WHERE id=?`,
    [title||task.title, description??task.description,
     assigned_to!==undefined ? (assigned_to||null) : task.assigned_to,
     status||task.status, priority||task.priority,
     due_date!==undefined ? (due_date||null) : task.due_date, req.params.id]);
  const updated = dbGet(`SELECT t.*, u.name as assignee_name, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id WHERE t.id = ?`, [req.params.id]);
  res.json({ message: 'Task updated', task: updated });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const task = dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  dbRun('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
