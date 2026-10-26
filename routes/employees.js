const express = require('express');
const router = express.Router();
const { dbQuery, dbGet, dbRun, logActivity } = require('../database/db');
const { cleanText, isValidEmail, isISODate, localISODate, toFiniteNumber, isPositiveInteger } = require('../utils/validation');

const EMPLOYEE_STATUSES = ['Active', 'On Leave', 'Inactive', 'Terminated'];
const GENDERS = ['Male', 'Female', 'Other'];

// List all employees with search & filters
router.get('/', async (req, res) => {
  try {
    const { search, department, status } = req.query;
    let sql = `
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ? OR e.designation LIKE ?)`;
      const queryPattern = `%${search}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (department && department !== 'all') {
      sql += ` AND e.department_id = ?`;
      params.push(department);
    }

    if (status && status !== 'all') {
      sql += ` AND e.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY e.id ASC`;

    const employees = await dbQuery(sql, params);
    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single employee details by ID
router.get('/:id', async (req, res) => {
  try {
    if (!isPositiveInteger(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    const employee = await dbGet(`
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Attendance summary
    const attendanceStats = await dbGet(`
      SELECT 
        COUNT(*) as totalDaysRecorded,
        SUM(CASE WHEN status = 'Present' OR status = 'Late' THEN 1 ELSE 0 END) as presentDays,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absentDays,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as halfDays
      FROM attendance
      WHERE employee_id = ?
    `, [req.params.id]);

    // Recent leaves
    const recentLeaves = await dbQuery(`
      SELECT * FROM leave_requests
      WHERE employee_id = ?
      ORDER BY id DESC
      LIMIT 5
    `, [req.params.id]);

    // Recent payrolls
    const recentPayroll = await dbQuery(`
      SELECT * FROM payroll
      WHERE employee_id = ?
      ORDER BY id DESC
      LIMIT 5
    `, [req.params.id]);

    res.json({
      success: true,
      employee,
      attendanceStats,
      recentLeaves,
      recentPayroll
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add new employee
router.post('/', async (req, res) => {
  try {
    let {
      first_name,
      last_name,
      email,
      phone,
      gender = 'Male',
      department_id,
      designation,
      joining_date,
      basic_salary,
      hra = 0,
      da = 0,
      allowances = 0,
      deductions = 0,
      status = 'Active',
      address = '',
      userRole = 'Admin'
    } = req.body;

    first_name = cleanText(first_name, 80);
    last_name = cleanText(last_name, 80);
    email = cleanText(email, 254).toLowerCase();
    phone = cleanText(phone, 30);
    designation = cleanText(designation, 120);
    address = cleanText(address, 500);

    if (!first_name || !last_name || !email || !designation || !basic_salary) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (First Name, Last Name, Email, Designation, Basic Salary).'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const basic = toFiniteNumber(basic_salary);
    if (basic === null || basic <= 0) {
      return res.status(400).json({ success: false, message: 'Basic salary must be greater than zero.' });
    }

    if (joining_date && !isISODate(joining_date)) {
      return res.status(400).json({ success: false, message: 'Joining date must be a valid date.' });
    }
    if (!GENDERS.includes(gender) || !EMPLOYEE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid gender or employee status.' });
    }
    if (department_id) {
      const department = await dbGet('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (!department) return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    // Check duplicate email
    const existing = await dbGet(`SELECT id FROM employees WHERE email = ?`, [email]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An employee with this email address already exists.' });
    }

    // Generate next employee code: e.g. EMP1021
    const lastEmp = await dbGet(`SELECT employee_code FROM employees ORDER BY id DESC LIMIT 1`);
    let nextCode = 'EMP1001';
    if (lastEmp && lastEmp.employee_code.startsWith('EMP')) {
      const num = parseInt(lastEmp.employee_code.replace('EMP', ''), 10);
      if (!isNaN(num)) {
        nextCode = `EMP${num + 1}`;
      }
    }

    // Auto calculate default HRA and DA if not provided
    const calcHra = toFiniteNumber(hra, Math.round(basic * 0.4));
    const calcDa = toFiniteNumber(da, Math.round(basic * 0.2));
    const calcAllow = toFiniteNumber(allowances, 0);
    const calcDed = toFiniteNumber(deductions, Math.round(basic * 0.05));
    if ([calcHra, calcDa, calcAllow, calcDed].some(value => value < 0)) {
      return res.status(400).json({ success: false, message: 'Salary components cannot be negative.' });
    }

    const result = await dbRun(`
      INSERT INTO employees (
        employee_code, first_name, last_name, email, phone, gender,
        department_id, designation, joining_date, basic_salary,
        hra, da, allowances, deductions, status, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nextCode, first_name, last_name, email, phone, gender,
      department_id || null, designation, joining_date || localISODate(),
      basic, calcHra, calcDa, calcAllow, calcDed, status, address
    ]);

    await logActivity(
      userRole,
      'Employee Added',
      `Added new employee: ${first_name} ${last_name} (${nextCode}) as ${designation}`
    );

    res.status(201).json({
      success: true,
      message: `Employee ${first_name} ${last_name} (${nextCode}) added successfully!`,
      employeeId: result.lastID,
      employeeCode: nextCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }

    let {
      first_name,
      last_name,
      email,
      phone,
      gender,
      department_id,
      designation,
      joining_date,
      basic_salary,
      hra,
      da,
      allowances,
      deductions,
      status,
      address,
      userRole = 'Admin'
    } = req.body;

    const existing = await dbGet(`SELECT * FROM employees WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    first_name = first_name === undefined ? undefined : cleanText(first_name, 80);
    last_name = last_name === undefined ? undefined : cleanText(last_name, 80);
    email = email === undefined ? undefined : cleanText(email, 254).toLowerCase();
    phone = phone === undefined ? undefined : cleanText(phone, 30);
    designation = designation === undefined ? undefined : cleanText(designation, 120);
    address = address === undefined ? undefined : cleanText(address, 500);

    if (email !== undefined && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (joining_date !== undefined && !isISODate(joining_date)) {
      return res.status(400).json({ success: false, message: 'Joining date must be a valid date.' });
    }
    if (gender !== undefined && !GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Invalid gender selection.' });
    }
    if (status !== undefined && !EMPLOYEE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid employee status.' });
    }
    if (department_id) {
      const department = await dbGet('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (!department) return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    const numericFields = { basic_salary, hra, da, allowances, deductions };
    for (const [field, value] of Object.entries(numericFields)) {
      if (value !== undefined && (toFiniteNumber(value) === null || Number(value) < 0)) {
        return res.status(400).json({ success: false, message: `${field.replace('_', ' ')} must be a non-negative number.` });
      }
    }
    if (basic_salary !== undefined && Number(basic_salary) <= 0) {
      return res.status(400).json({ success: false, message: 'Basic salary must be greater than zero.' });
    }

    // Email uniqueness check (if changed)
    if (email && email !== existing.email) {
      const emailDup = await dbGet(`SELECT id FROM employees WHERE email = ? AND id != ?`, [email, id]);
      if (emailDup) {
        return res.status(400).json({ success: false, message: 'Email already registered with another employee.' });
      }
    }

    await dbRun(`
      UPDATE employees SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        gender = ?,
        department_id = ?,
        designation = ?,
        joining_date = ?,
        basic_salary = ?,
        hra = ?,
        da = ?,
        allowances = ?,
        deductions = ?,
        status = ?,
        address = ?
      WHERE id = ?
    `, [
      first_name || existing.first_name,
      last_name || existing.last_name,
      email || existing.email,
      phone !== undefined ? phone : existing.phone,
      gender || existing.gender,
      department_id !== undefined ? department_id : existing.department_id,
      designation || existing.designation,
      joining_date || existing.joining_date,
      basic_salary !== undefined ? parseFloat(basic_salary) : existing.basic_salary,
      hra !== undefined ? parseFloat(hra) : existing.hra,
      da !== undefined ? parseFloat(da) : existing.da,
      allowances !== undefined ? parseFloat(allowances) : existing.allowances,
      deductions !== undefined ? parseFloat(deductions) : existing.deductions,
      status || existing.status,
      address !== undefined ? address : existing.address,
      id
    ]);

    await logActivity(
      userRole,
      'Employee Updated',
      `Updated profile of ${first_name || existing.first_name} ${last_name || existing.last_name} (${existing.employee_code})`
    );

    res.json({
      success: true,
      message: 'Employee updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be a positive number.' });
    }
    const { userRole = 'Admin' } = req.body;

    const existing = await dbGet(`SELECT * FROM employees WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Delete related records and employee
    await dbRun(`DELETE FROM attendance WHERE employee_id = ?`, [id]);
    await dbRun(`DELETE FROM leave_requests WHERE employee_id = ?`, [id]);
    await dbRun(`DELETE FROM payroll WHERE employee_id = ?`, [id]);
    await dbRun(`DELETE FROM employees WHERE id = ?`, [id]);

    await logActivity(
      userRole,
      'Employee Deleted',
      `Deleted employee ${existing.first_name} ${existing.last_name} (${existing.employee_code})`
    );

    res.json({
      success: true,
      message: `Employee ${existing.first_name} ${existing.last_name} deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
