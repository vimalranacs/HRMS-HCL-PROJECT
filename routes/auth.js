const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');

// List demo roles and available employees for demo switcher
router.get('/demo-users', async (req, res) => {
  try {
    const employees = await dbQuery(
      `SELECT id, employee_code, first_name, last_name, email, designation, department_id 
       FROM employees 
       WHERE status = 'Active' 
       ORDER BY id ASC`
    );

    const roles = [
      {
        id: 'admin',
        name: 'System Admin',
        role: 'Admin',
        badge: 'Full Access',
        description: 'Complete administrative access to all modules, settings, and CRUD actions'
      },
      {
        id: 'hr_manager',
        name: 'Anita Verma',
        role: 'HR Manager',
        badge: 'HR Ops',
        description: 'Manage employees, approve/reject leaves, run payroll, and export reports'
      },
      {
        id: 'employee',
        name: 'Employee Self-Service',
        role: 'Employee',
        badge: 'Self-Service',
        description: 'Personal profile, mark daily attendance, apply for leaves, and print payslips'
      }
    ];

    res.json({
      success: true,
      roles,
      employees
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
