const express = require('express');
const router = express.Router();
const { dbQuery, dbGet, dbRun, logActivity } = require('../database/db');
const { cleanText, isISODate, localISODate, isPositiveInteger } = require('../utils/validation');

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day'];

// Get attendance for a specific date (default today)
router.get('/today', async (req, res) => {
  try {
    const date = req.query.date || localISODate();
    if (!isISODate(date)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid attendance date.' });
    }

    const records = await dbQuery(`
      SELECT 
        e.id as employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.designation,
        d.name as department_name,
        a.id as attendance_id,
        a.date,
        a.clock_in,
        a.clock_out,
        COALESCE(a.status, 'Not Marked') as status,
        a.notes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.status = 'Active'
      ORDER BY e.id ASC
    `, [date]);

    // Calculate totals for the selected date
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let notMarkedCount = 0;

    records.forEach(r => {
      if (r.status === 'Present') presentCount++;
      else if (r.status === 'Absent') absentCount++;
      else if (r.status === 'Late') lateCount++;
      else if (r.status === 'Half Day') halfDayCount++;
      else notMarkedCount++;
    });

    res.json({
      success: true,
      date,
      summary: {
        total: records.length,
        presentCount,
        absentCount,
        lateCount,
        halfDayCount,
        notMarkedCount
      },
      records
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark or update attendance
router.post('/mark', async (req, res) => {
  try {
    let {
      employee_id,
      date = localISODate(),
      status = 'Present',
      clock_in,
      clock_out,
      notes = '',
      allow_override = false,
      userRole = 'Admin'
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    if (!isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    if (!isISODate(date)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid attendance date.' });
    }
    if (!ATTENDANCE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance status.' });
    }
    notes = cleanText(notes, 500);

    const emp = await dbGet(`SELECT first_name, last_name, employee_code, status FROM employees WHERE id = ?`, [employee_id]);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    if (emp.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Attendance can only be recorded for active employees.' });
    }

    // Default clock times
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const inTime = clock_in !== undefined ? clock_in : (status === 'Absent' ? null : currentTime);
    const outTime = clock_out !== undefined ? clock_out : (status === 'Absent' ? null : null);

    // Check if duplicate entry exists for this date
    const existing = await dbGet(`SELECT * FROM attendance WHERE employee_id = ? AND date = ?`, [employee_id, date]);

    if (existing) {
      if (!allow_override) {
        // Return existing data with message
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: `Attendance for ${emp.first_name} on ${date} is already marked as '${existing.status}'. Do you wish to update it?`,
          existing
        });
      }

      // Update existing record
      await dbRun(`
        UPDATE attendance SET
          status = ?,
          clock_in = ?,
          clock_out = ?,
          notes = ?
        WHERE id = ?
      `, [status, inTime, outTime, notes, existing.id]);

      await logActivity(
        userRole,
        'Attendance Updated',
        `Updated attendance for ${emp.first_name} ${emp.last_name} (${date}) to ${status}`
      );

      return res.json({
        success: true,
        message: `Attendance for ${emp.first_name} updated successfully to ${status}.`
      });
    }

    // Insert new record
    await dbRun(`
      INSERT INTO attendance (employee_id, date, clock_in, clock_out, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [employee_id, date, inTime, outTime, status, notes]);

    await logActivity(
      userRole,
      'Attendance Marked',
      `Marked attendance for ${emp.first_name} ${emp.last_name} (${date}): ${status}`
    );

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully for ${emp.first_name} (${status}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employee specific attendance history
router.get('/employee/:id', async (req, res) => {
  try {
    const employee_id = req.params.id;
    if (!isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    const history = await dbQuery(`
      SELECT * FROM attendance
      WHERE employee_id = ?
      ORDER BY date DESC
      LIMIT 30
    `, [employee_id]);

    const stats = await dbGet(`
      SELECT 
        COUNT(*) as totalDays,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as presentDays,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as lateDays,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as halfDays,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absentDays
      FROM attendance
      WHERE employee_id = ?
    `, [employee_id]);

    res.json({
      success: true,
      stats: stats || {},
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Overall attendance history with filters
router.get('/history', async (req, res) => {
  try {
    const { employee_id, status, from_date, to_date } = req.query;
    if (employee_id && employee_id !== 'all' && !isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    if (status && status !== 'all' && !ATTENDANCE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance status filter.' });
    }
    if ((from_date && !isISODate(from_date)) || (to_date && !isISODate(to_date))) {
      return res.status(400).json({ success: false, message: 'Attendance filters must use valid dates.' });
    }
    if (from_date && to_date && from_date > to_date) {
      return res.status(400).json({ success: false, message: 'From date cannot be later than to date.' });
    }
    let sql = `
      SELECT 
        a.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id && employee_id !== 'all') {
      sql += ` AND a.employee_id = ?`;
      params.push(employee_id);
    }

    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    if (from_date) {
      sql += ` AND a.date >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      sql += ` AND a.date <= ?`;
      params.push(to_date);
    }

    sql += ` ORDER BY a.date DESC, a.id DESC LIMIT 100`;

    const records = await dbQuery(sql, params);
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
