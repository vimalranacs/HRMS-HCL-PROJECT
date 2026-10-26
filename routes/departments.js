const express = require('express');
const router = express.Router();
const { dbQuery, dbGet, dbRun, logActivity } = require('../database/db');
const { cleanText, toFiniteNumber, isPositiveInteger } = require('../utils/validation');

// List all departments with stats
router.get('/', async (req, res) => {
  try {
    const departments = await dbQuery(`
      SELECT 
        d.*,
        COUNT(e.id) as employee_count,
        COALESCE(SUM(e.basic_salary + e.hra + e.da + e.allowances), 0) as total_payroll_cost
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      GROUP BY d.id
      ORDER BY d.id ASC
    `);

    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create department
router.post('/', async (req, res) => {
  try {
    const name = cleanText(req.body.name, 120);
    const code = cleanText(req.body.code, 12).toUpperCase();
    const headName = cleanText(req.body.head_name, 120);
    const description = cleanText(req.body.description, 500);
    const parsedBudget = toFiniteNumber(req.body.budget, 0);
    const userRole = cleanText(req.body.userRole || 'Admin', 40);

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and unique code are required.' });
    }

    if (!/^[A-Z0-9-]{2,12}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Department code must be 2-12 letters, numbers, or hyphens.' });
    }
    if (parsedBudget < 0) {
      return res.status(400).json({ success: false, message: 'Department budget cannot be negative.' });
    }

    const existing = await dbGet(`SELECT id FROM departments WHERE lower(name) = lower(?) OR upper(code) = upper(?)`, [name, code]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department with this name or code already exists.' });
    }

    const result = await dbRun(`
      INSERT INTO departments (name, code, head_name, budget, description)
      VALUES (?, ?, ?, ?, ?)
    `, [name, code, headName, parsedBudget, description]);

    await logActivity(userRole, 'Department Created', `Created department ${name} (${code})`);

    res.status(201).json({
      success: true,
      message: `Department '${name}' created successfully.`,
      departmentId: result.lastID
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Department ID must be a positive number.' });
    }

    const name = req.body.name === undefined ? undefined : cleanText(req.body.name, 120);
    const code = req.body.code === undefined ? undefined : cleanText(req.body.code, 12).toUpperCase();
    const headName = req.body.head_name === undefined ? undefined : cleanText(req.body.head_name, 120);
    const description = req.body.description === undefined ? undefined : cleanText(req.body.description, 500);
    const parsedBudget = req.body.budget === undefined ? undefined : toFiniteNumber(req.body.budget);
    const userRole = cleanText(req.body.userRole || 'Admin', 40);

    const existing = await dbGet(`SELECT * FROM departments WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }


    if (name !== undefined && !name) {
      return res.status(400).json({ success: false, message: 'Department name cannot be empty.' });
    }
    if (code !== undefined && !/^[A-Z0-9-]{2,12}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Department code must be 2-12 letters, numbers, or hyphens.' });
    }
    if (parsedBudget !== undefined && (parsedBudget === null || parsedBudget < 0)) {
      return res.status(400).json({ success: false, message: 'Department budget must be a non-negative number.' });
    }

    const duplicate = await dbGet(
      `SELECT id FROM departments WHERE (lower(name) = lower(?) OR upper(code) = upper(?)) AND id != ?`,
      [name || existing.name, code || existing.code, id]
    );
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Department name or code is already in use.' });
    }

    await dbRun(`
      UPDATE departments SET
        name = ?,
        code = ?,
        head_name = ?,
        budget = ?,
        description = ?
      WHERE id = ?
    `, [
      name || existing.name,
      code || existing.code,
      headName !== undefined ? headName : existing.head_name,
      parsedBudget !== undefined ? parsedBudget : existing.budget,
      description !== undefined ? description : existing.description,
      id
    ]);

    await logActivity(userRole, 'Department Updated', `Updated department details for ${name || existing.name}`);

    res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Department ID must be a positive number.' });
    }
    const { userRole = 'Admin' } = req.body;

    const dept = await dbGet(`SELECT * FROM departments WHERE id = ?`, [id]);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Unassign employees
    await dbRun(`UPDATE employees SET department_id = NULL WHERE department_id = ?`, [id]);
    await dbRun(`DELETE FROM departments WHERE id = ?`, [id]);

    await logActivity(userRole, 'Department Deleted', `Deleted department ${dept.name} (${dept.code})`);

    res.json({ success: true, message: `Department '${dept.name}' deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
