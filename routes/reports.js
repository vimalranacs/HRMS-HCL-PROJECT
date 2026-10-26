const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');

// Helper to convert rows to CSV format
function convertToCSV(data, fields) {
  if (!data || data.length === 0) return '';
  const header = fields.map(f => `"${f.label}"`).join(',');
  const rows = data.map(row => {
    return fields.map(f => {
      let val = row[f.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
  });
  return [header, ...rows].join('\r\n');
}

// 1. Employee Report
router.get('/employees', async (req, res) => {
  try {
    const { department, status, exportCSV } = req.query;
    let sql = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as full_name,
        e.email,
        e.phone,
        e.gender,
        d.name as department,
        e.designation,
        e.joining_date,
        e.basic_salary,
        e.hra,
        e.da,
        e.allowances,
        (e.basic_salary + e.hra + e.da + e.allowances) as gross_salary,
        e.status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (department && department !== 'all') {
      sql += ` AND e.department_id = ?`;
      params.push(department);
    }
    if (status && status !== 'all') {
      sql += ` AND e.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY e.id ASC`;

    const records = await dbQuery(sql, params);

    if (exportCSV === 'true') {
      const fields = [
        { key: 'employee_code', label: 'Employee Code' },
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'gender', label: 'Gender' },
        { key: 'department', label: 'Department' },
        { key: 'designation', label: 'Designation' },
        { key: 'joining_date', label: 'Joining Date' },
        { key: 'basic_salary', label: 'Basic Salary' },
        { key: 'gross_salary', label: 'Gross Salary' },
        { key: 'status', label: 'Status' }
      ];
      const csv = convertToCSV(records, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hrms_employees_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Attendance Report
router.get('/attendance', async (req, res) => {
  try {
    const { from_date, to_date, status, department, exportCSV } = req.query;
    let sql = `
      SELECT 
        a.id,
        a.date,
        e.employee_code,
        e.first_name || ' ' || e.last_name as full_name,
        d.name as department,
        a.clock_in,
        a.clock_out,
        a.status,
        a.notes
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      sql += ` AND a.date >= ?`;
      params.push(from_date);
    }
    if (to_date) {
      sql += ` AND a.date <= ?`;
      params.push(to_date);
    }
    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (department && department !== 'all') {
      sql += ` AND e.department_id = ?`;
      params.push(department);
    }

    sql += ` ORDER BY a.date DESC, e.id ASC LIMIT 200`;

    const records = await dbQuery(sql, params);

    if (exportCSV === 'true') {
      const fields = [
        { key: 'date', label: 'Date' },
        { key: 'employee_code', label: 'Employee Code' },
        { key: 'full_name', label: 'Full Name' },
        { key: 'department', label: 'Department' },
        { key: 'clock_in', label: 'Clock In' },
        { key: 'clock_out', label: 'Clock Out' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' }
      ];
      const csv = convertToCSV(records, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hrms_attendance_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Leave Report
router.get('/leaves', async (req, res) => {
  try {
    const { status, leave_type, department, exportCSV } = req.query;
    let sql = `
      SELECT 
        l.id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as full_name,
        d.name as department,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.days_count,
        l.reason,
        l.status,
        l.applied_on,
        l.action_by,
        l.action_date
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
    if (leave_type && leave_type !== 'all') {
      sql += ` AND l.leave_type = ?`;
      params.push(leave_type);
    }
    if (department && department !== 'all') {
      sql += ` AND e.department_id = ?`;
      params.push(department);
    }

    sql += ` ORDER BY l.id DESC`;

    const records = await dbQuery(sql, params);

    if (exportCSV === 'true') {
      const fields = [
        { key: 'id', label: 'Request ID' },
        { key: 'employee_code', label: 'Employee Code' },
        { key: 'full_name', label: 'Full Name' },
        { key: 'department', label: 'Department' },
        { key: 'leave_type', label: 'Leave Type' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        { key: 'days_count', label: 'Days' },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status' },
        { key: 'applied_on', label: 'Applied Date' },
        { key: 'action_by', label: 'Reviewed By' }
      ];
      const csv = convertToCSV(records, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hrms_leave_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Payroll Report
router.get('/payroll', async (req, res) => {
  try {
    const { month_year, payment_status, department, exportCSV } = req.query;
    let sql = `
      SELECT 
        p.id,
        p.month_year,
        e.employee_code,
        e.first_name || ' ' || e.last_name as full_name,
        d.name as department,
        p.pay_date,
        p.basic_salary,
        p.hra,
        p.da,
        p.allowances,
        p.gross_salary,
        p.pf,
        p.tax,
        p.deductions,
        p.net_salary,
        p.payment_status,
        p.payment_method
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (month_year && month_year !== 'all') {
      sql += ` AND p.month_year = ?`;
      params.push(month_year);
    }
    if (payment_status && payment_status !== 'all') {
      sql += ` AND p.payment_status = ?`;
      params.push(payment_status);
    }
    if (department && department !== 'all') {
      sql += ` AND e.department_id = ?`;
      params.push(department);
    }

    sql += ` ORDER BY p.id DESC`;

    const records = await dbQuery(sql, params);

    if (exportCSV === 'true') {
      const fields = [
        { key: 'month_year', label: 'Month/Year' },
        { key: 'employee_code', label: 'Employee Code' },
        { key: 'full_name', label: 'Full Name' },
        { key: 'department', label: 'Department' },
        { key: 'pay_date', label: 'Payment Date' },
        { key: 'basic_salary', label: 'Basic' },
        { key: 'gross_salary', label: 'Gross Salary' },
        { key: 'pf', label: 'PF' },
        { key: 'tax', label: 'Tax' },
        { key: 'deductions', label: 'Total Deductions' },
        { key: 'net_salary', label: 'Net Salary' },
        { key: 'payment_status', label: 'Status' },
        { key: 'payment_method', label: 'Method' }
      ];
      const csv = convertToCSV(records, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hrms_payroll_report.csv"');
      return res.send(csv);
    }

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
