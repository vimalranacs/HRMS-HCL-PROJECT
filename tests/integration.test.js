const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const testDatabasePath = path.join(os.tmpdir(), `hrms-integration-${process.pid}.db`);
process.env.HRMS_DB_PATH = testDatabasePath;

const { startServer } = require('../server');
const { closeDatabase } = require('../database/db');

let server;
let baseUrl;

async function api(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data };
}

before(async () => {
  server = await startServer(0);
  if (!server.listening) await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, 'close');
  }
  await closeDatabase();
  fs.rmSync(testDatabasePath, { force: true });
});

test('serves the local SPA and local vendor assets', async () => {
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Apex People Operations/);

  const bootstrap = await fetch(`${baseUrl}/vendor/bootstrap/css/bootstrap.min.css`);
  assert.equal(bootstrap.status, 200);

  const unknownApi = await api('/api/not-a-route');
  assert.equal(unknownApi.response.status, 404);
  assert.equal(unknownApi.data.success, false);
});

test('returns working dashboard, demo roles, and core lists', async () => {
  const [dashboard, users, departments, employees] = await Promise.all([
    api('/api/dashboard/stats'),
    api('/api/auth/demo-users'),
    api('/api/departments'),
    api('/api/employees')
  ]);

  assert.equal(dashboard.data.success, true);
  assert.equal(dashboard.data.data.totalEmployees, 20);
  assert.equal(users.data.roles.length, 3);
  assert.equal(users.data.employees.length, 20);
  assert.equal(departments.data.departments.length, 5);
  assert.equal(employees.data.employees.length, 20);
});

test('completes employee, attendance, leave, payroll, report, and cleanup workflows', async () => {
  const createdDepartment = await api('/api/departments', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Customer Success',
      code: 'CS',
      head_name: 'Ishita Roy',
      budget: 175000,
      description: 'Customer onboarding and account success',
      userRole: 'System Admin'
    })
  });
  assert.equal(createdDepartment.response.status, 201);
  const departmentId = createdDepartment.data.departmentId;

  const createdEmployee = await api('/api/employees', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'Ishaan',
      last_name: 'Kapoor',
      email: 'ishaan.kapoor@example.test',
      phone: '+91 90000 12345',
      gender: 'Male',
      department_id: departmentId,
      designation: 'Customer Success Manager',
      joining_date: '2026-10-20',
      basic_salary: 62000,
      hra: 24800,
      da: 12400,
      allowances: 4500,
      deductions: 3500,
      status: 'Active',
      address: 'Indore, India',
      userRole: 'System Admin'
    })
  });
  assert.equal(createdEmployee.response.status, 201);
  const employeeId = createdEmployee.data.employeeId;

  const attendance = await api('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      date: '2026-10-26',
      status: 'Present',
      clock_in: '09:05 AM',
      notes: 'Integration test entry',
      userRole: 'HR Manager'
    })
  });
  assert.equal(attendance.response.status, 201);

  const duplicateAttendance = await api('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, date: '2026-10-26', status: 'Absent' })
  });
  assert.equal(duplicateAttendance.response.status, 409);

  const updatedAttendance = await api('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, date: '2026-10-26', status: 'Absent', allow_override: true })
  });
  assert.equal(updatedAttendance.response.status, 200);

  const attendanceDay = await api('/api/attendance/today?date=2026-10-26');
  const employeeAttendance = attendanceDay.data.records.find(record => record.employee_id === employeeId);
  assert.equal(employeeAttendance.status, 'Absent');
  assert.equal(employeeAttendance.clock_in, null);

  const leave = await api('/api/leaves/apply', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      leave_type: 'Annual Leave',
      start_date: '2026-12-10',
      end_date: '2026-12-12',
      reason: 'Family event',
      userRole: 'Employee'
    })
  });
  assert.equal(leave.response.status, 201);
  assert.equal(leave.data.success, true);

  const overlap = await api('/api/leaves/apply', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      leave_type: 'Casual Leave',
      start_date: '2026-12-11',
      end_date: '2026-12-11',
      reason: 'Overlapping request'
    })
  });
  assert.equal(overlap.response.status, 409);

  const approval = await api(`/api/leaves/${leave.data.leaveId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Approved', action_remarks: 'Approved for test', userRole: 'HR Manager' })
  });
  assert.equal(approval.response.status, 200);

  const payroll = await api('/api/payroll/generate', {
    method: 'POST',
    body: JSON.stringify({ month_year: 'December 2026', pay_date: '2026-12-31', userRole: 'HR Manager' })
  });
  assert.equal(payroll.response.status, 200);
  assert.equal(payroll.data.count, 21);

  const employeePayroll = await api(`/api/payroll/employee/${employeeId}`);
  assert.equal(employeePayroll.data.records.length, 1);
  assert.ok(employeePayroll.data.records[0].net_salary > 0);

  const report = await api('/api/reports/payroll?month_year=December+2026');
  assert.equal(report.data.count, 21);

  const csv = await fetch(`${baseUrl}/api/reports/employees?exportCSV=true`);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(await csv.text(), /Employee Code/);

  const invalidEmployee = await api('/api/employees', {
    method: 'POST',
    body: JSON.stringify({ first_name: 'Bad', last_name: 'Email', email: 'not-an-email', designation: 'Tester', basic_salary: 10 })
  });
  assert.equal(invalidEmployee.response.status, 400);

  const deletedEmployee = await api(`/api/employees/${employeeId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userRole: 'System Admin' })
  });
  assert.equal(deletedEmployee.response.status, 200);

  const deletedDepartment = await api(`/api/departments/${departmentId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userRole: 'System Admin' })
  });
  assert.equal(deletedDepartment.response.status, 200);
});
