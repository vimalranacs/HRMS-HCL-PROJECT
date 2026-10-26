const express = require('express');
const router = express.Router();
const { dbQuery, dbGet } = require('../database/db');
const { localISODate } = require('../utils/validation');

// Dashboard summary statistics
router.get('/stats', async (req, res) => {
  try {
    const today = localISODate();

    // Total employees & active employees
    const empStats = await dbGet(`
      SELECT 
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeEmployees
      FROM employees
    `);

    // Total departments
    const deptStats = await dbGet(`SELECT COUNT(*) as totalDepartments FROM departments`);

    // Today's attendance
    const attendanceStats = await dbGet(`
      SELECT 
        SUM(CASE WHEN status = 'Present' OR status = 'Late' THEN 1 ELSE 0 END) as presentToday,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absentToday,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as halfDayToday
      FROM attendance
      WHERE date = ?
    `, [today]);

    // Pending leaves
    const leaveStats = await dbGet(`
      SELECT COUNT(*) as pendingLeaves
      FROM leave_requests
      WHERE status = 'Pending'
    `);

    // Monthly payroll total (latest month)
    const payrollStats = await dbGet(`
      SELECT 
        SUM(net_salary) as monthlyPayroll,
        COUNT(*) as payrollCount
      FROM payroll
      WHERE month_year = (SELECT month_year FROM payroll ORDER BY id DESC LIMIT 1)
    `);

    res.json({
      success: true,
      data: {
        totalEmployees: empStats.totalEmployees || 0,
        activeEmployees: empStats.activeEmployees || 0,
        totalDepartments: deptStats.totalDepartments || 0,
        presentToday: attendanceStats.presentToday || 0,
        absentToday: attendanceStats.absentToday || 0,
        halfDayToday: attendanceStats.halfDayToday || 0,
        pendingLeaves: leaveStats.pendingLeaves || 0,
        monthlyPayroll: Math.round(payrollStats.monthlyPayroll || 0),
        payrollCount: payrollStats.payrollCount || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Interactive Charts Data
router.get('/charts', async (req, res) => {
  try {
    const today = localISODate();

    // 1. Employees per department
    const deptDistribution = await dbQuery(`
      SELECT d.name as department, COUNT(e.id) as employeeCount
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      GROUP BY d.id
      ORDER BY employeeCount DESC
    `);

    // 2. Today's attendance status breakdown
    const attendanceBreakdown = await dbQuery(`
      SELECT status, COUNT(*) as count
      FROM attendance
      WHERE date = ?
      GROUP BY status
    `, [today]);

    // 3. Department-wise salary expenditure
    const deptSalary = await dbQuery(`
      SELECT d.name as department, SUM(e.basic_salary + e.hra + e.da + e.allowances) as totalGross
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      GROUP BY d.id
      ORDER BY totalGross DESC
    `);

    // 4. Monthly payroll trends (past months)
    const payrollTrends = await dbQuery(`
      SELECT month_year as month, SUM(net_salary) as totalNet, SUM(gross_salary) as totalGross, COUNT(id) as employeesPaid
      FROM payroll
      GROUP BY month_year
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      charts: {
        deptDistribution,
        attendanceBreakdown,
        deptSalary,
        payrollTrends
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recent Activities Feed
router.get('/recent-activities', async (req, res) => {
  try {
    const activities = await dbQuery(`
      SELECT * FROM activities
      ORDER BY id DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      activities
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
