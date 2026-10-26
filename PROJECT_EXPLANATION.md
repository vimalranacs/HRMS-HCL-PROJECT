# Comprehensive Project Explanation
**Human Resource Management System (HRMS) — B.Tech CSE College Project**

This document explains the HRMS project in simple, beginner-friendly terms. You can review this guide before your college practical or viva examination to understand the complete end-to-end flow of the software.

---

## 1. Project Overview & Objective

### What is an HRMS?
A **Human Resource Management System (HRMS)** is an enterprise software solution used by corporate companies to manage employee records, daily attendance, leave approvals, monthly payroll calculations, department divisions, and analytical reporting.

### Why was this project built?
Small and medium organizations often struggle with fragmented spreadsheets for tracking employees, attendance, and salary slips. This project provides a centralized, automated web portal with:
1. Instant calculation of gross salary, allowances (HRA, DA), statutory deductions (PF, Income Tax TDS), and net take-home salary.
2. An online roll call and attendance tracking mechanism that prevents accidental duplicate entries for the same date.
3. An approval workflow for vacation and sick leave requests.
4. Role-based view segregation (Administrators, HR Managers, and Employees).
5. Fast, lightweight performance using standard web technologies without heavy dependencies.

---

## 2. High-Level Architecture

The project follows the standard **Client-Server Architecture (3-Tier Architecture)**:

```
+-------------------------------------------------------------+
|                     PRESENTATION TIER                       |
|           HTML5 + CSS3 + Bootstrap 5 + Vanilla JS           |
|         Single Page Application (SPA) in Web Browser        |
+------------------------------+------------------------------+
                               |
                        HTTP / REST APIs
                               |
+------------------------------v------------------------------+
|                     APPLICATION TIER                        |
|             Node.js Runtime + Express.js Server             |
|   Static Asset Server + Modular REST API Route Controllers  |
+------------------------------+------------------------------+
                               |
                          SQL Queries
                               |
+------------------------------v------------------------------+
|                        DATA TIER                            |
|             SQLite3 Relational Database Engine              |
|        File-based Persistent Storage (hrms.db)              |
+-------------------------------------------------------------+
```

1. **Client (Presentation Tier)**: Runs in the user's web browser. It renders the user interface using HTML5, Bootstrap 5, and vanilla JavaScript. It uses `fetch()` to send asynchronous requests to the backend server without page reloads.
2. **Server (Application Tier)**: A Node.js environment running an Express.js server on port 3000. It receives HTTP requests (GET, POST, PUT, DELETE), validates data, executes business logic (like payroll calculation), and queries the database.
3. **Database (Data Tier)**: A local SQLite3 database (`hrms.db`). SQLite stores all tables in a single binary file on the computer's hard drive, ensuring zero cloud subscription requirements and effortless local portability.

---

## 3. Frontend Architecture Explained

The frontend is structured as a **Single Page Application (SPA)**:
- **`public/index.html`**: Contains the complete layout shell:
  - Sidebar navigation
  - Top navigation bar with the live clock and demo role switcher
  - 8 distinct view containers (`#view-dashboard`, `#view-employees`, `#view-departments`, `#view-attendance`, `#view-leaves`, `#view-payroll`, `#view-reports`, `#view-selfservice`)
  - Modals for adding employees, viewing profiles, marking attendance, submitting leaves, processing payroll, and viewing printable payslips.
- **`public/css/style.css`**: Defines custom corporate styling:
  - Clean blue-and-white enterprise palette (`#0d6efd`, slate borders, soft shadows)
  - Card hover transitions and status badges
  - Dedicated `@media print` CSS rules that isolate the payslip card and hide headers/footers when the user clicks **Print Payslip**.
- **`public/js/` (Modular Vanilla JavaScript)**:
  - `api.js`: Centralized JavaScript object with `fetch()` wrapper functions for all backend endpoints.
  - `app.js`: Main state controller. It manages the active view, handles role switching, toggles sidebar menu visibility based on permissions, and displays Bootstrap toast alerts.
  - `dashboard.js`: Pulls summary metrics and instantiates 4 Chart.js charts.
  - `employees.js`: Handles employee table rendering, search inputs, department filters, and CRUD modals.
  - `departments.js`: Renders department cards, budgets, and head of department records.
  - `attendance.js`: Loads attendance for any selected date, allows 1-click status updates, and handles duplicate-entry validation.
  - `leaves.js`: Shows pending and reviewed leave requests, with Approve and Reject actions.
  - `payroll.js`: Formats monthly payroll records and renders the official payslip modal with print functionality.
  - `reports.js`: Displays four master reports and handles 1-click CSV file exports.
  - `selfservice.js`: Personal view for employees to clock in, see their remaining leave quotas, and inspect their payslips.

---

## 4. Backend & REST API Design

The backend uses Express.js with clean, RESTful API conventions:

### Why REST?
REST (Representational State Transfer) uses standard HTTP methods:
- **GET**: Retrieve records (e.g. `GET /api/employees`)
- **POST**: Create a new record (e.g. `POST /api/employees`)
- **PUT**: Update an existing record (e.g. `PUT /api/employees/1`)
- **DELETE**: Remove a record (e.g. `DELETE /api/employees/1`)

### Key API Routes Table:

| Resource | Route | Method | Purpose |
|---|---|---|---|
| **Auth** | `/api/auth/demo-users` | GET | List demo roles and active staff for role switching |
| **Dashboard** | `/api/dashboard/stats` | GET | Total employees, present/absent counts, pending leaves |
| | `/api/dashboard/charts` | GET | Data for department and payroll charts |
| | `/api/dashboard/recent-activities` | GET | Latest 10 system audit entries |
| **Employees** | `/api/employees` | GET | Filterable employee list |
| | `/api/employees/:id` | GET | Detailed profile, attendance summary, and leaves |
| | `/api/employees` | POST | Add new employee with auto-generated code |
| | `/api/employees/:id` | PUT | Update employee details |
| | `/api/employees/:id` | DELETE | Delete employee & cascade records |
| **Departments** | `/api/departments` | GET | List departments with head count & budget |
| | `/api/departments` | POST | Create a new department |
| | `/api/departments/:id` | PUT | Edit department details |
| | `/api/departments/:id` | DELETE | Delete department |
| **Attendance** | `/api/attendance/today` | GET | Attendance records for selected date |
| | `/api/attendance/mark` | POST | Record or update daily clock-in/status |
| | `/api/attendance/employee/:id` | GET | Attendance log for single employee |
| **Leaves** | `/api/leaves` | GET | All leave requests with status filters |
| | `/api/leaves/apply` | POST | Submit new leave application |
| | `/api/leaves/:id/status` | PUT | Approve or reject a leave request |
| | `/api/leaves/employee/:id` | GET | Leave history & remaining quotas |
| **Payroll** | `/api/payroll` | GET | Filterable payroll records |
| | `/api/payroll/generate` | POST | Batch payroll calculation engine |
| | `/api/payroll/:id/payslip` | GET | Formatted data for printable payslip |
| | `/api/payroll/:id/status` | PUT | Toggle payment status (Paid / Pending) |
| **Reports** | `/api/reports/employees` | GET | Employee report & CSV export |
| | `/api/reports/attendance` | GET | Attendance report & CSV export |
| | `/api/reports/leaves` | GET | Leave report & CSV export |
| | `/api/reports/payroll` | GET | Payroll register & CSV export |

---

## 5. Payroll Calculation Formula Explained

In standard Indian corporate practice, salary is divided into **Gross Earnings** and **Statutory Deductions**:

1. **Basic Salary**: The fixed base pay of the employee.
2. **HRA (House Rent Allowance)**: Calculated as 40% of Basic Salary.
3. **DA (Dearness Allowance)**: Calculated as 20% of Basic Salary.
4. **Special Allowances**: Additional monthly allowances.
$$\text{Gross Salary} = \text{Basic} + \text{HRA} + \text{DA} + \text{Allowances}$$

5. **Provident Fund (PF)**: Compulsory employee retirement fund, calculated as 12% of Basic Salary:
$$\text{PF} = \text{Basic} \times 0.12$$
6. **Income Tax (TDS)**: Tax deducted at source, approximated at 8% of Gross Salary:
$$\text{Tax} = \text{Gross} \times 0.08$$
7. **Total Deductions**:
$$\text{Total Deductions} = \text{PF} + \text{Tax} + \text{Other Deductions}$$
8. **Net Take-Home Salary**:
$$\text{Net Salary} = \text{Gross Salary} - \text{Total Deductions}$$

When you click **Run Monthly Payroll** in the application, this mathematical model runs automatically for every active employee in the database!

---

## 6. Role-Based Access Control (RBAC) in Demo Mode

The system implements a transparent 3-tier demo role model:
- **System Admin**: Complete privileges across all 8 modules, CRUD operations, and budget adjustments.
- **HR Manager (Anita Verma)**: Access to workforce management, daily roll call, leave approval/rejection actions, batch payroll processing, and audit reporting.
- **Employee Self-Service (e.g. Aarav Patel / Priya Nair)**: Restricted personal workspace. The administrative navigation links are automatically hidden. The employee sees only their personal attendance log, biometric check-in button, annual leave quota meters, and personal salary payslips.

This design cleanly demonstrates role-based security concepts during a college evaluation without requiring complex password encryption or JWT tokens.
