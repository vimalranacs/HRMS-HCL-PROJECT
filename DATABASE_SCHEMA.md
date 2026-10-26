# Database Schema & Entity-Relationship (ER) Documentation
**Human Resource Management System (HRMS) — SQLite3 Database**

This document details the database architecture of the HRMS project, including table definitions, field types, constraints, and relational mappings.

---

## 1. Entity-Relationship (ER) Diagram

```
+------------------+         1 : N         +--------------------+
|   departments    |<----------------------|     employees      |
+------------------+                       +--------------------+
| id (PK)          |                       | id (PK)            |
| name             |                       | employee_code (UQ) |
| code (UQ)        |                       | first_name         |
| head_name        |                       | last_name          |
| budget           |                       | email (UQ)         |
| description      |                       | department_id (FK) |
| created_at       |                       | designation        |
+------------------+                       | basic_salary       |
                                           | ...                |
                                           +---------+----------+
                                                     |
                     +-------------------------------+-------------------------------+
                     | 1 : N                         | 1 : N                         | 1 : N
                     v                               v                               v
           +--------------------+          +--------------------+          +--------------------+
           |     attendance     |          |   leave_requests   |          |      payroll       |
           +--------------------+          +--------------------+          +--------------------+
           | id (PK)            |          | id (PK)            |          | id (PK)            |
           | employee_id (FK)   |          | employee_id (FK)   |          | employee_id (FK)   |
           | date               |          | leave_type         |          | month_year         |
           | clock_in           |          | start_date         |          | pay_date           |
           | clock_out          |          | end_date           |          | basic_salary       |
           | status             |          | days_count         |          | gross_salary       |
           | notes              |          | reason             |          | deductions         |
           | UNIQUE(emp_id,dt)  |          | status             |          | net_salary         |
           +--------------------+          | applied_on         |          | UNIQUE(emp,month)  |
                                           +--------------------+          +--------------------+

                                           +--------------------+
                                           |     activities     |
                                           +--------------------+
                                           | id (PK)            |
                                           | user_role          |
                                           | action             |
                                           | details            |
                                           | timestamp          |
                                           +--------------------+
```

---

## 2. Table Specifications

### 1. `departments` Table
Stores organizational divisions and department-level leadership.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique department identifier |
| `name` | TEXT | NOT NULL, UNIQUE | Full department name (e.g. Software Engineering) |
| `code` | TEXT | NOT NULL, UNIQUE | Short code (e.g. ENG, HR, FIN) |
| `head_name` | TEXT | NULLABLE | Name of the department director or head |
| `budget` | REAL | DEFAULT 0 | Annual operating budget allocated in INR |
| `description` | TEXT | NULLABLE | Purpose and scope of the department |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp when record was created |

---

### 2. `employees` Table
Stores master personal and compensation data for all company personnel.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal primary key |
| `employee_code` | TEXT | NOT NULL, UNIQUE | Public employee code (e.g. EMP1001) |
| `first_name` | TEXT | NOT NULL | Employee first name |
| `last_name` | TEXT | NOT NULL | Employee last name |
| `email` | TEXT | NOT NULL, UNIQUE | Corporate email address |
| `phone` | TEXT | NULLABLE | Contact telephone number |
| `gender` | TEXT | DEFAULT 'Other' | Gender identity (Male, Female, Other) |
| `department_id` | INTEGER | FOREIGN KEY -> `departments(id)` | Foreign key reference to departments |
| `designation` | TEXT | NOT NULL | Job title (e.g. Frontend Engineer) |
| `joining_date` | TEXT | NOT NULL | Official date of hire (YYYY-MM-DD) |
| `basic_salary` | REAL | NOT NULL | Base monthly salary component in INR |
| `hra` | REAL | DEFAULT 0 | House Rent Allowance (40% of basic) |
| `da` | REAL | DEFAULT 0 | Dearness Allowance (20% of basic) |
| `allowances` | REAL | DEFAULT 0 | Additional special allowances |
| `deductions` | REAL | DEFAULT 0 | Recurring individual deductions |
| `status` | TEXT | DEFAULT 'Active' | Status: `Active`, `On Leave`, `Terminated` |
| `address` | TEXT | NULLABLE | Residential address |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

---

### 3. `attendance` Table
Tracks daily working hours, biometric check-ins, and absence logs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log ID |
| `employee_id` | INTEGER | NOT NULL, FK -> `employees(id)` | Target employee |
| `date` | TEXT | NOT NULL | Attendance date (YYYY-MM-DD) |
| `clock_in` | TEXT | NULLABLE | Check-in timestamp (e.g. 09:12 AM) |
| `clock_out` | TEXT | NULLABLE | Check-out timestamp (e.g. 05:48 PM) |
| `status` | TEXT | NOT NULL | Status: `Present`, `Absent`, `Late`, `Half Day` |
| `notes` | TEXT | NULLABLE | Remarks (e.g. Approved half-day, Traffic) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Audit timestamp |

> **Crucial Integrity Constraint**: `UNIQUE(employee_id, date)` ensures that an employee cannot have multiple conflicting attendance entries for the same calendar date.

---

### 4. `leave_requests` Table
Records leave applications and HR review actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Request ticket ID |
| `employee_id` | INTEGER | NOT NULL, FK -> `employees(id)` | Applying employee |
| `leave_type` | TEXT | NOT NULL | `Sick Leave`, `Casual Leave`, `Annual Leave` |
| `start_date` | TEXT | NOT NULL | Beginning date of absence |
| `end_date` | TEXT | NOT NULL | Return date |
| `days_count` | INTEGER | NOT NULL | Total calendar days requested |
| `reason` | TEXT | NOT NULL | Justification for absence |
| `status` | TEXT | DEFAULT 'Pending' | Status: `Pending`, `Approved`, `Rejected` |
| `applied_on` | TEXT | NOT NULL | Date application was submitted |
| `action_by` | TEXT | NULLABLE | Reviewing officer (e.g. HR Manager) |
| `action_date` | TEXT | NULLABLE | Date action was taken |
| `action_remarks` | TEXT | NULLABLE | Reason for approval or rejection |

---

### 5. `payroll` Table
Contains historical monthly compensation disbursements and itemized salary slips.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Payroll disbursement record ID |
| `employee_id` | INTEGER | NOT NULL, FK -> `employees(id)` | Target employee |
| `month_year` | TEXT | NOT NULL | Pay period (e.g. October 2026) |
| `pay_date` | TEXT | NOT NULL | Official date of payment (YYYY-MM-DD) |
| `basic_salary` | REAL | NOT NULL | Base salary for the month |
| `hra` | REAL | NOT NULL | House Rent Allowance |
| `da` | REAL | NOT NULL | Dearness Allowance |
| `allowances` | REAL | NOT NULL | Special allowances |
| `gross_salary` | REAL | NOT NULL | Total gross earnings (Basic + HRA + DA + Allow.) |
| `pf` | REAL | NOT NULL | Provident Fund deduction (12% of basic) |
| `tax` | REAL | NOT NULL | TDS Income tax deduction (8% of gross) |
| `deductions` | REAL | NOT NULL | Total deductions (PF + Tax + Other) |
| `net_salary` | REAL | NOT NULL | Final take-home pay (Gross - Deductions) |
| `payment_status` | TEXT | DEFAULT 'Paid' | Status: `Paid` or `Pending` |
| `payment_method` | TEXT | DEFAULT 'Bank Transfer' | Payment channel (Bank Transfer / Cheque) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record timestamp |

> **Integrity Constraint**: `UNIQUE(employee_id, month_year)` ensures an employee is paid exactly once per monthly billing cycle.

---

### 6. `activities` Table
Provides an automated audit trail of critical system actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Audit event sequence ID |
| `user_role` | TEXT | DEFAULT 'Admin' | Initiating role (Admin, HR Manager, Employee) |
| `action` | TEXT | NOT NULL | Event name (e.g. Employee Added, Leave Approved) |
| `details` | TEXT | NULLABLE | Descriptive summary of the operation |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Exact date and time of the event |

---

## 3. Database Integrity & Foreign Key Policies

1. **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON;` is explicitly executed upon connection.
2. **Cascading Deletes**:
   - In `attendance`, `leave_requests`, and `payroll`, rows specify `ON DELETE CASCADE`. If an employee record is removed, all associated history is automatically cleaned up, preventing orphan records.
3. **Graceful Department Removal**:
   - In `employees`, the department reference specifies `ON DELETE SET NULL`. If a department is discontinued, employees are kept intact and marked as unassigned.
