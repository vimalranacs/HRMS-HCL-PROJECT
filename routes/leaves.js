const express = require('express');
const router = express.Router();
const { dbQuery, dbGet, dbRun, logActivity } = require('../database/db');
const { cleanText, isISODate, localISODate, isPositiveInteger } = require('../utils/validation');

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Annual Leave'];

// List all leave requests
router.get('/', async (req, res) => {
  try {
    const { status, employee_id, leave_type } = req.query;
    let sql = `
      SELECT 
        l.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.designation,
        d.name as department_name
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND l.status = ?`;
      params.push(status);
    }

    if (employee_id && employee_id !== 'all') {
      sql += ` AND l.employee_id = ?`;
      params.push(employee_id);
    }

    if (leave_type && leave_type !== 'all') {
      sql += ` AND l.leave_type = ?`;
      params.push(leave_type);
    }

    sql += ` ORDER BY l.id DESC`;

    const leaves = await dbQuery(sql, params);
    res.json({ success: true, count: leaves.length, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Apply for leave
router.post('/apply', async (req, res) => {
  try {
    let {
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      userRole = 'Employee'
    } = req.body;

    reason = cleanText(reason, 700);

    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Employee, Leave Type, Start Date, End Date, Reason) are required.'
      });
    }

    if (!isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    if (!LEAVE_TYPES.includes(leave_type)) {
      return res.status(400).json({ success: false, message: 'Please select a valid leave type.' });
    }
    if (!isISODate(start_date) || !isISODate(end_date)) {
      return res.status(400).json({ success: false, message: 'Please provide valid leave dates.' });
    }

    const emp = await dbGet(`SELECT first_name, last_name, employee_code, status FROM employees WHERE id = ?`, [employee_id]);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    if (emp.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Leave can only be requested for active employees.' });
    }

    // Calculate days count
    if (end_date < start_date) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
    }
    const d1 = new Date(`${start_date}T00:00:00Z`);
    const d2 = new Date(`${end_date}T00:00:00Z`);
    const diffTime = d2 - d1;
    const days_count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const overlapping = await dbGet(`
      SELECT id FROM leave_requests
      WHERE employee_id = ?
        AND status != 'Rejected'
        AND start_date <= ?
        AND end_date >= ?
      LIMIT 1
    `, [employee_id, end_date, start_date]);
    if (overlapping) {
      return res.status(409).json({ success: false, message: 'This employee already has an overlapping leave request.' });
    }

    const applied_on = localISODate();

    const result = await dbRun(`
      INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, days_count,
        reason, status, applied_on
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
    `, [employee_id, leave_type, start_date, end_date, days_count, reason, applied_on]);

    await logActivity(
      userRole,
      'Leave Application',
      `${emp.first_name} ${emp.last_name} (${emp.employee_code}) applied for ${days_count} day(s) ${leave_type}`
    );

    res.status(201).json({
      success: true,
      message: `Leave request for ${days_count} day(s) submitted successfully!`,
      leaveId: result.lastID
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve or Reject leave request
router.put('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Leave request ID must be a positive number.' });
    }
    const { status, userRole = 'HR Manager' } = req.body;
    const action_remarks = cleanText(req.body.action_remarks, 500);

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be either Approved or Rejected.' });
    }

    const leave = await dbGet(`
      SELECT l.*, e.first_name, e.last_name, e.employee_code
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      WHERE l.id = ?
    `, [id]);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const action_date = localISODate();
    const action_by = userRole === 'Admin' ? 'System Administrator' : 'HR Manager';

    await dbRun(`
      UPDATE leave_requests SET
        status = ?,
        action_by = ?,
        action_date = ?,
        action_remarks = ?
      WHERE id = ?
    `, [status, action_by, action_date, action_remarks, id]);

    await logActivity(
      userRole,
      `Leave ${status}`,
      `${userRole} marked leave request #${id} for ${leave.first_name} ${leave.last_name} as ${status}`
    );

    res.json({
      success: true,
      message: `Leave request has been marked as ${status}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get employee specific leaves and quota balances
router.get('/employee/:id', async (req, res) => {
  try {
    const employee_id = req.params.id;
    if (!isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }

    const leaves = await dbQuery(`
      SELECT * FROM leave_requests
      WHERE employee_id = ?
      ORDER BY id DESC
    `, [employee_id]);

    // Standard annual allocation
    const totalSickAllowed = 12;
    const totalCasualAllowed = 10;
    const totalAnnualAllowed = 15;

    let sickUsed = 0;
    let casualUsed = 0;
    let annualUsed = 0;

    leaves.forEach(l => {
      if (l.status === 'Approved') {
        if (l.leave_type === 'Sick Leave') sickUsed += l.days_count;
        else if (l.leave_type === 'Casual Leave') casualUsed += l.days_count;
        else if (l.leave_type === 'Annual Leave') annualUsed += l.days_count;
      }
    });

    res.json({
      success: true,
      balances: {
        sick: { allowed: totalSickAllowed, used: sickUsed, remaining: Math.max(0, totalSickAllowed - sickUsed) },
        casual: { allowed: totalCasualAllowed, used: casualUsed, remaining: Math.max(0, totalCasualAllowed - casualUsed) },
        annual: { allowed: totalAnnualAllowed, used: annualUsed, remaining: Math.max(0, totalAnnualAllowed - annualUsed) }
      },
      leaves
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
