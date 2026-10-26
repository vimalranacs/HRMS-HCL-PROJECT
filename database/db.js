const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { localISODate } = require('../utils/validation');

const DB_PATH = process.env.HRMS_DB_PATH || path.join(__dirname, 'hrms.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Helper promises for clean async/await in Express routes
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to log activities
async function logActivity(userRole, action, details) {
  try {
    await dbRun(
      `INSERT INTO activities (user_role, action, details, timestamp) VALUES (?, ?, ?, datetime('now', 'localtime'))`,
      [userRole || 'Admin', action, details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

// Initialize tables and seed realistic sample data
async function initDatabase() {
  // Enable foreign keys
  await dbRun('PRAGMA foreign_keys = ON;');
  await dbRun('PRAGMA busy_timeout = 5000;');

  // 1. Departments table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      head_name TEXT,
      budget REAL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 2. Employees table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      gender TEXT DEFAULT 'Other',
      department_id INTEGER,
      designation TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      hra REAL DEFAULT 0,
      da REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      address TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );
  `);

  // 3. Attendance table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    );
  `);

  // 4. Leave requests table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      applied_on TEXT NOT NULL,
      action_by TEXT,
      action_date TEXT,
      action_remarks TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 5. Payroll table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month_year TEXT NOT NULL,
      pay_date TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      hra REAL NOT NULL,
      da REAL NOT NULL,
      allowances REAL NOT NULL,
      gross_salary REAL NOT NULL,
      pf REAL NOT NULL,
      tax REAL NOT NULL,
      deductions REAL NOT NULL,
      net_salary REAL NOT NULL,
      payment_status TEXT DEFAULT 'Paid',
      payment_method TEXT DEFAULT 'Bank Transfer',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, month_year)
    );
  `);

  // 6. Activities table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_role TEXT DEFAULT 'Admin',
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Index the columns used most often by dashboard and report filters.
  await dbRun('CREATE INDEX IF NOT EXISTS idx_employees_department_status ON employees(department_id, status);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_attendance_date_employee ON attendance(date, employee_id);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_leave_status_employee ON leave_requests(status, employee_id);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_payroll_month_employee ON payroll(month_year, employee_id);');

  // Check if seeding is needed
  const deptCountRow = await dbGet('SELECT COUNT(*) as count FROM departments');
  if (deptCountRow.count === 0) {
    console.log('Seeding initial realistic HRMS dataset...');
    await seedDatabase();
    console.log('Sample dataset seeded successfully.');
  }
}

async function seedDatabase() {
  // 1. Seed 5 Departments
  const departments = [
    { name: 'Software Engineering', code: 'ENG', head_name: 'Dr. Rajesh Sharma', budget: 350000, description: 'Core product engineering and development' },
    { name: 'Human Resources', code: 'HR', head_name: 'Anita Verma', budget: 120000, description: 'Talent acquisition, employee care and payroll' },
    { name: 'Marketing & Sales', code: 'MKT', head_name: 'Priya Nair', budget: 180000, description: 'Brand expansion, digital marketing, client sales' },
    { name: 'Finance & Accounts', code: 'FIN', head_name: 'Vikram Malhotra', budget: 150000, description: 'Corporate auditing, taxes, budgets, financial compliance' },
    { name: 'Operations & IT Support', code: 'OPS', head_name: 'Sunil Mehta', budget: 130000, description: 'Cloud infrastructure, office operations and technical support' }
  ];

  for (const dept of departments) {
    await dbRun(
      `INSERT INTO departments (name, code, head_name, budget, description) VALUES (?, ?, ?, ?, ?)`,
      [dept.name, dept.code, dept.head_name, dept.budget, dept.description]
    );
  }

  // 2. Seed 20 Realistic Employees
  const employees = [
    { code: 'EMP1001', fn: 'Aarav', ln: 'Patel', email: 'aarav.patel@company.com', phone: '+91 98201 11223', gender: 'Male', deptId: 1, desig: 'Lead Full Stack Architect', date: '2022-03-15', basic: 95000, hra: 38000, da: 19000, allow: 8000, ded: 6500, status: 'Active', addr: 'Tech Residency, Pune, India' },
    { code: 'EMP1002', fn: 'Priya', ln: 'Nair', email: 'priya.nair@company.com', phone: '+91 98202 22334', gender: 'Female', deptId: 3, desig: 'Marketing Director', date: '2021-06-10', basic: 88000, hra: 35000, da: 17600, allow: 7400, ded: 6000, status: 'Active', addr: 'Bandra West, Mumbai, India' },
    { code: 'EMP1003', fn: 'Rohan', ln: 'Verma', email: 'rohan.verma@company.com', phone: '+91 98203 33445', gender: 'Male', deptId: 1, desig: 'Senior Software Engineer', date: '2023-01-20', basic: 75000, hra: 30000, da: 15000, allow: 6000, ded: 5200, status: 'Active', addr: 'HSR Layout, Bengaluru, India' },
    { code: 'EMP1004', fn: 'Anita', ln: 'Verma', email: 'anita.verma@company.com', phone: '+91 98204 44556', gender: 'Female', deptId: 2, desig: 'HR Director', date: '2020-11-01', basic: 85000, hra: 34000, da: 17000, allow: 7000, ded: 5800, status: 'Active', addr: 'Sector 45, Gurgaon, India' },
    { code: 'EMP1005', fn: 'Vikram', ln: 'Malhotra', email: 'vikram.malhotra@company.com', phone: '+91 98205 55667', gender: 'Male', deptId: 4, desig: 'Finance Controller', date: '2021-02-18', basic: 89000, hra: 35600, da: 17800, allow: 7200, ded: 6100, status: 'Active', addr: 'Connaught Place, New Delhi, India' },
    { code: 'EMP1006', fn: 'Sunil', ln: 'Mehta', email: 'sunil.mehta@company.com', phone: '+91 98206 66778', gender: 'Male', deptId: 5, desig: 'Operations Manager', date: '2022-08-05', basic: 72000, hra: 28800, da: 14400, allow: 5500, ded: 4900, status: 'Active', addr: 'Salt Lake Sector V, Kolkata, India' },
    { code: 'EMP1007', fn: 'Neha', ln: 'Kulkarni', email: 'neha.kulkarni@company.com', phone: '+91 98207 77889', gender: 'Female', deptId: 1, desig: 'Frontend Engineer', date: '2023-05-12', basic: 60000, hra: 24000, da: 12000, allow: 4800, ded: 4100, status: 'Active', addr: 'Kothrud, Pune, India' },
    { code: 'EMP1008', fn: 'Aditya', ln: 'Rao', email: 'aditya.rao@company.com', phone: '+91 98208 88990', gender: 'Male', deptId: 1, desig: 'DevOps & Cloud Engineer', date: '2023-09-01', basic: 68000, hra: 27200, da: 13600, allow: 5200, ded: 4600, status: 'Active', addr: 'Whitefield, Bengaluru, India' },
    { code: 'EMP1009', fn: 'Kavita', ln: 'Joshi', email: 'kavita.joshi@company.com', phone: '+91 98209 99001', gender: 'Female', deptId: 2, desig: 'HR Specialist & Recruiter', date: '2023-03-10', basic: 52000, hra: 20800, da: 10400, allow: 4000, ded: 3500, status: 'Active', addr: 'Malad West, Mumbai, India' },
    { code: 'EMP1010', fn: 'Suresh', ln: 'Iyer', email: 'suresh.iyer@company.com', phone: '+91 98210 10102', gender: 'Male', deptId: 4, desig: 'Senior Financial Auditor', date: '2022-12-01', basic: 70000, hra: 28000, da: 14000, allow: 5500, ded: 4800, status: 'Active', addr: 'T Nagar, Chennai, India' },
    { code: 'EMP1011', fn: 'Ananya', ln: 'Sen', email: 'ananya.sen@company.com', phone: '+91 98211 21213', gender: 'Female', deptId: 3, desig: 'Digital Campaign Strategist', date: '2024-01-15', basic: 54000, hra: 21600, da: 10800, allow: 4200, ded: 3600, status: 'Active', addr: 'Park Street, Kolkata, India' },
    { code: 'EMP1012', fn: 'Gaurav', ln: 'Kapoor', email: 'gaurav.kapoor@company.com', phone: '+91 98212 32324', gender: 'Male', deptId: 5, desig: 'IT Infrastructure Administrator', date: '2023-07-22', basic: 58000, hra: 23200, da: 11600, allow: 4500, ded: 3900, status: 'Active', addr: 'Noida Sector 62, Uttar Pradesh, India' },
    { code: 'EMP1013', fn: 'Meera', ln: 'Deshmukh', email: 'meera.deshmukh@company.com', phone: '+91 98213 43435', gender: 'Female', deptId: 1, desig: 'QA Automation Lead', date: '2022-10-10', basic: 65000, hra: 26000, da: 13000, allow: 5000, ded: 4400, status: 'Active', addr: 'Aundh, Pune, India' },
    { code: 'EMP1014', fn: 'Rajesh', ln: 'Sharma', email: 'rajesh.sharma@company.com', phone: '+91 98214 54546', gender: 'Male', deptId: 1, desig: 'VP of Engineering', date: '2020-04-01', basic: 120000, hra: 48000, da: 24000, allow: 10000, ded: 8500, status: 'Active', addr: 'Indiranagar, Bengaluru, India' },
    { code: 'EMP1015', fn: 'Shweta', ln: 'Bansal', email: 'shweta.bansal@company.com', phone: '+91 98215 65657', gender: 'Female', deptId: 4, desig: 'Payroll Specialist', date: '2023-04-18', basic: 51000, hra: 20400, da: 10200, allow: 3900, ded: 3400, status: 'Active', addr: 'Janakpuri, New Delhi, India' },
    { code: 'EMP1016', fn: 'Karan', ln: 'Singhania', email: 'karan.singhania@company.com', phone: '+91 98216 76768', gender: 'Male', deptId: 3, desig: 'Content & Brand Lead', date: '2023-11-05', basic: 56000, hra: 22400, da: 11200, allow: 4300, ded: 3800, status: 'Active', addr: 'Koregaon Park, Pune, India' },
    { code: 'EMP1017', fn: 'Divya', ln: 'Choudhary', email: 'divya.choudhary@company.com', phone: '+91 98217 87879', gender: 'Female', deptId: 2, desig: 'Employee Relations Lead', date: '2022-05-30', basic: 61000, hra: 24400, da: 12200, allow: 4700, ded: 4100, status: 'Active', addr: 'Cyber City, Gurgaon, India' },
    { code: 'EMP1018', fn: 'Manish', ln: 'Reddy', email: 'manish.reddy@company.com', phone: '+91 98218 98980', gender: 'Male', deptId: 5, desig: 'Logistics Supervisor', date: '2023-02-14', basic: 53000, hra: 21200, da: 10600, allow: 4100, ded: 3600, status: 'Active', addr: 'Gachibowli, Hyderabad, India' },
    { code: 'EMP1019', fn: 'Pooja', ln: 'Thakur', email: 'pooja.thakur@company.com', phone: '+91 98219 09091', gender: 'Female', deptId: 1, desig: 'Mobile App Developer', date: '2024-02-01', basic: 57000, hra: 22800, da: 11400, allow: 4400, ded: 3800, status: 'Active', addr: 'Banjara Hills, Hyderabad, India' },
    { code: 'EMP1020', fn: 'Amit', ln: 'Saxena', email: 'amit.saxena@company.com', phone: '+91 98220 12122', gender: 'Male', deptId: 3, desig: 'SEO & Growth Specialist', date: '2023-08-20', basic: 50000, hra: 20000, da: 10000, allow: 3800, ded: 3300, status: 'Active', addr: 'Jayanagar, Bengaluru, India' }
  ];

  for (const emp of employees) {
    await dbRun(
      `INSERT INTO employees (
        employee_code, first_name, last_name, email, phone, gender,
        department_id, designation, joining_date, basic_salary,
        hra, da, allowances, deductions, status, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.code, emp.fn, emp.ln, emp.email, emp.phone, emp.gender,
        emp.deptId, emp.desig, emp.date, emp.basic,
        emp.hra, emp.da, emp.allow, emp.ded, emp.status, emp.addr
      ]
    );
  }

  // 3. Seed Attendance History (Recent 7 days including today)
  const today = new Date();
  const dateStrings = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dateStrings.push(localISODate(d));
  }

  // Loop through 20 employees and 7 days
  for (let empId = 1; empId <= 20; empId++) {
    for (const dt of dateStrings) {
      // Create realistic attendance distribution: 85% Present, 10% Late/HalfDay, 5% Absent
      const rand = (empId * 17 + dt.charCodeAt(dt.length - 1)) % 100;
      let status = 'Present';
      let inTime = '09:12 AM';
      let outTime = '05:48 PM';
      let notes = 'Regular working day';

      if (rand < 7) {
        status = 'Absent';
        inTime = null;
        outTime = null;
        notes = 'Unplanned absence / sick leave';
      } else if (rand < 15) {
        status = 'Late';
        inTime = '10:25 AM';
        outTime = '06:30 PM';
        notes = 'Traffic delay';
      } else if (rand < 20) {
        status = 'Half Day';
        inTime = '09:30 AM';
        outTime = '01:30 PM';
        notes = 'Approved half day';
      }

      await dbRun(
        `INSERT OR IGNORE INTO attendance (employee_id, date, clock_in, clock_out, status, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [empId, dt, inTime, outTime, status, notes]
      );
    }
  }

  // 4. Seed Leave Requests
  const sampleLeaves = [
    { empId: 1, type: 'Annual Leave', start: '2026-11-05', end: '2026-11-08', days: 4, reason: 'Family vacation and personal travel', status: 'Approved', applied: '2026-10-20', actionBy: 'Anita Verma', actionDate: '2026-10-21', remarks: 'Approved by HR Director' },
    { empId: 3, type: 'Sick Leave', start: '2026-10-27', end: '2026-10-28', days: 2, reason: 'Severe viral fever and medical consultation', status: 'Pending', applied: '2026-10-25', actionBy: null, actionDate: null, remarks: null },
    { empId: 7, type: 'Casual Leave', start: '2026-11-02', end: '2026-11-03', days: 2, reason: 'Attending cousin wedding in Mumbai', status: 'Pending', applied: '2026-10-24', actionBy: null, actionDate: null, remarks: null },
    { empId: 9, type: 'Sick Leave', start: '2026-10-15', end: '2026-10-16', days: 2, reason: 'Migraine and eye checkup', status: 'Approved', applied: '2026-10-14', actionBy: 'Anita Verma', actionDate: '2026-10-14', remarks: 'Medical certificate submitted' },
    { empId: 11, type: 'Annual Leave', start: '2026-11-12', end: '2026-11-18', days: 7, reason: 'Annual holiday trip', status: 'Pending', applied: '2026-10-22', actionBy: null, actionDate: null, remarks: null },
    { empId: 13, type: 'Casual Leave', start: '2026-10-10', end: '2026-10-11', days: 2, reason: 'Urgent home maintenance', status: 'Approved', applied: '2026-10-08', actionBy: 'Dr. Rajesh Sharma', actionDate: '2026-10-09', remarks: 'Approved' },
    { empId: 16, type: 'Casual Leave', start: '2026-10-05', end: '2026-10-06', days: 2, reason: 'Personal errands', status: 'Rejected', applied: '2026-10-03', actionBy: 'Priya Nair', actionDate: '2026-10-04', remarks: 'Quarterly marketing sprint deadline' },
    { empId: 19, type: 'Sick Leave', start: '2026-11-01', end: '2026-11-02', days: 2, reason: 'Dental surgery recovery', status: 'Pending', applied: '2026-10-25', actionBy: null, actionDate: null, remarks: null }
  ];

  for (const lv of sampleLeaves) {
    await dbRun(
      `INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, days_count,
        reason, status, applied_on, action_by, action_date, action_remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lv.empId, lv.type, lv.start, lv.end, lv.days,
        lv.reason, lv.status, lv.applied, lv.actionBy, lv.actionDate, lv.remarks
      ]
    );
  }

  // 5. Seed Payroll History (Current month + previous month)
  const currentMonthStr = 'October 2026';
  const prevMonthStr = 'September 2026';

  for (let empId = 1; empId <= 20; empId++) {
    const emp = employees[empId - 1];
    const gross = emp.basic + emp.hra + emp.da + emp.allow;
    const pf = Math.round(emp.basic * 0.12);
    const tax = Math.round(gross * 0.08);
    const totalDeductions = pf + tax + emp.ded;
    const net = gross - totalDeductions;

    // September payroll (Paid)
    await dbRun(
      `INSERT INTO payroll (
        employee_id, month_year, pay_date, basic_salary, hra, da, allowances,
        gross_salary, pf, tax, deductions, net_salary, payment_status, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId, prevMonthStr, '2026-09-30', emp.basic, emp.hra, emp.da, emp.allow,
        gross, pf, tax, totalDeductions, net, 'Paid', 'Bank Transfer'
      ]
    );

    // October payroll (Paid for first 15, Pending for last 5)
    const status = empId <= 15 ? 'Paid' : 'Pending';
    await dbRun(
      `INSERT INTO payroll (
        employee_id, month_year, pay_date, basic_salary, hra, da, allowances,
        gross_salary, pf, tax, deductions, net_salary, payment_status, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId, currentMonthStr, '2026-10-31', emp.basic, emp.hra, emp.da, emp.allow,
        gross, pf, tax, totalDeductions, net, status, 'Bank Transfer'
      ]
    );
  }

  // 6. Seed Recent Activities
  const sampleActivities = [
    { role: 'Admin', action: 'System Initialized', details: 'Database seeded with 20 employees and 5 core departments.' },
    { role: 'HR Manager', action: 'Payroll Generated', details: 'Generated payroll for month October 2026 for 20 employees.' },
    { role: 'HR Manager', action: 'Leave Approved', details: 'Approved 4 days Annual Leave for Aarav Patel (EMP1001).' },
    { role: 'Employee', action: 'Leave Application', details: 'Rohan Verma (EMP1003) submitted a Sick Leave request for 2 days.' },
    { role: 'Employee', action: 'Attendance Marked', details: 'Neha Kulkarni (EMP1007) checked in at 09:12 AM.' },
    { role: 'Admin', action: 'Department Updated', details: 'Budget revised for Software Engineering Department to $350,000.' },
    { role: 'HR Manager', action: 'Attendance Audit', details: 'Validated morning biometric attendance records for all active staff.' },
    { role: 'Employee', action: 'Payslip Viewed', details: 'Vikram Malhotra (EMP1005) downloaded payslip for September 2026.' }
  ];

  for (const act of sampleActivities) {
    await dbRun(
      `INSERT INTO activities (user_role, action, details) VALUES (?, ?, ?)`,
      [act.role, act.action, act.details]
    );
  }
}

module.exports = {
  db,
  dbQuery,
  dbGet,
  dbRun,
  logActivity,
  initDatabase,
  closeDatabase
};
