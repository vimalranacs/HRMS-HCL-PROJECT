const express = require('express');
const router = express.Router();
const { dbQuery, dbGet, dbRun, logActivity } = require('../database/db');
const { cleanText, isISODate, localISODate, isPositiveInteger, isValidMonthYear } = require('../utils/validation');

// List payroll records
router.get('/', async (req, res) => {
  try {
    const { month_year, employee_id, status } = req.query;
    let sql = `
      SELECT 
        p.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.designation,
        d.name as department_name
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

    if (employee_id && employee_id !== 'all') {
      sql += ` AND p.employee_id = ?`;
      params.push(employee_id);
    }

    if (status && status !== 'all') {
      sql += ` AND p.payment_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY p.id DESC`;

    const records = await dbQuery(sql, params);

    // Get list of available distinct months
    const availableMonths = await dbQuery(`
      SELECT DISTINCT month_year FROM payroll ORDER BY id DESC
    `);

    res.json({
      success: true,
      count: records.length,
      availableMonths: availableMonths.map(m => m.month_year),
      records
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Payroll high level summary
router.get('/summary', async (req, res) => {
  try {
    const month = req.query.month_year;
    let sql = `
      SELECT 
        COUNT(*) as totalProcessed,
        SUM(gross_salary) as totalGross,
        SUM(deductions) as totalDeductions,
        SUM(net_salary) as totalNet,
        SUM(CASE WHEN payment_status = 'Paid' THEN net_salary ELSE 0 END) as totalPaid,
        SUM(CASE WHEN payment_status = 'Pending' THEN net_salary ELSE 0 END) as totalPending,
        SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END) as countPaid,
        SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END) as countPending
      FROM payroll
    `;
    const params = [];
    if (month && month !== 'all') {
      sql += ` WHERE month_year = ?`;
      params.push(month);
    }

    const summary = await dbGet(sql, params);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate payroll for a given month for all active employees
router.post('/generate', async (req, res) => {
  try {
    const month_year = cleanText(req.body.month_year, 30);
    const pay_date = cleanText(req.body.pay_date, 10);
    const userRole = cleanText(req.body.userRole || 'HR Manager', 40);

    if (!month_year) {
      return res.status(400).json({ success: false, message: 'Please specify the month and year (e.g. November 2026).' });
    }
    if (!isValidMonthYear(month_year)) {
      return res.status(400).json({ success: false, message: 'Month and year must look like “November 2026”.' });
    }
    if (pay_date && !isISODate(pay_date)) {
      return res.status(400).json({ success: false, message: 'Payment date must be a valid date.' });
    }

    const activeEmployees = await dbQuery(`SELECT * FROM employees WHERE status = 'Active'`);
    if (activeEmployees.length === 0) {
      return res.status(400).json({ success: false, message: 'No active employees found to generate payroll.' });
    }

    const dateOfPay = pay_date || localISODate();
    let generatedCount = 0;
    let updatedCount = 0;

    for (const emp of activeEmployees) {
      const basic = emp.basic_salary || 0;
      const hra = emp.hra ?? Math.round(basic * 0.4);
      const da = emp.da ?? Math.round(basic * 0.2);
      const allowances = emp.allowances ?? 0;
      const gross = basic + hra + da + allowances;

      const pf = Math.round(basic * 0.12);
      const tax = Math.round(gross * 0.08);
      const totalDeductions = pf + tax + (emp.deductions ?? 0);
      const net = gross - totalDeductions;
      if (net < 0) {
        return res.status(400).json({
          success: false,
          message: `Payroll cannot be generated because deductions exceed gross salary for ${emp.employee_code}.`
        });
      }

      // Check if entry already exists
      const existing = await dbGet(
        `SELECT id FROM payroll WHERE employee_id = ? AND month_year = ?`,
        [emp.id, month_year]
      );

      if (existing) {
        await dbRun(`
          UPDATE payroll SET
            pay_date = ?,
            basic_salary = ?,
            hra = ?,
            da = ?,
            allowances = ?,
            gross_salary = ?,
            pf = ?,
            tax = ?,
            deductions = ?,
            net_salary = ?
          WHERE id = ?
        `, [dateOfPay, basic, hra, da, allowances, gross, pf, tax, totalDeductions, net, existing.id]);
        updatedCount++;
      } else {
        await dbRun(`
          INSERT INTO payroll (
            employee_id, month_year, pay_date, basic_salary, hra, da, allowances,
            gross_salary, pf, tax, deductions, net_salary, payment_status, payment_method
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', 'Bank Transfer')
        `, [emp.id, month_year, dateOfPay, basic, hra, da, allowances, gross, pf, tax, totalDeductions, net]);
        generatedCount++;
      }
    }

    await logActivity(
      userRole,
      'Payroll Generated',
      `Processed payroll for ${month_year} (${generatedCount} created, ${updatedCount} updated)`
    );

    res.json({
      success: true,
      message: `Payroll for ${month_year} successfully processed for ${activeEmployees.length} employees (${generatedCount} new, ${updatedCount} refreshed).`,
      count: activeEmployees.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update single payroll payment status (Paid / Pending)
router.put('/:id/status', async (req, res) => {
  try {
    if (!isPositiveInteger(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Payroll ID must be a positive number.' });
    }
    const { status, userRole = 'HR Manager' } = req.body;
    if (!['Paid', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Paid or Pending.' });
    }

    const record = await dbGet(`SELECT * FROM payroll WHERE id = ?`, [req.params.id]);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    await dbRun(`UPDATE payroll SET payment_status = ? WHERE id = ?`, [status, req.params.id]);

    await logActivity(userRole, 'Payroll Status Updated', `Changed payroll #${req.params.id} status to ${status}`);

    res.json({ success: true, message: `Payment status changed to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Printable Payslip endpoint
router.get('/:id/payslip', async (req, res) => {
  try {
    if (!isPositiveInteger(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Payroll ID must be a positive number.' });
    }
    const payslip = await dbGet(`
      SELECT 
        p.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.gender,
        e.designation,
        e.joining_date,
        e.address,
        d.name as department_name,
        d.code as department_code
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip record not found.' });
    }

    res.json({
      success: true,
      company: {
        name: 'Apex Global Enterprises Pvt. Ltd.',
        tagline: 'Enterprise Human Resource & Workforce Management',
        address: 'TechnoPark CyberCity, Building B, Sector 62',
        city: 'Bengaluru / New Delhi, India',
        phone: '+91 (080) 4123-4567',
        taxId: 'GSTIN: 29AAACA1234F1Z8'
      },
      payslip
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employee personal payroll history
router.get('/employee/:id', async (req, res) => {
  try {
    const employee_id = req.params.id;
    if (!isPositiveInteger(employee_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    const records = await dbQuery(`
      SELECT 
        p.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.designation,
        d.name as department_name
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.employee_id = ?
      ORDER BY p.id DESC
    `, [employee_id]);

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
