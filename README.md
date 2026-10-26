# Comprehensive HR Management System (HRMS)
**College Project: 3rd Year B.Tech Computer Science & Engineering (CSE)**

A complete, beginner-friendly, and visually professional corporate **Human Resource Management System (HRMS)** built with pure **HTML, Vanilla JavaScript, Bootstrap 5, Node.js (Express), and SQLite3**.

---

## 🌟 Key Highlights

- **Professional SaaS Interface**: Restrained visual system with responsive navigation, accessible controls, polished tables, forms, feedback, and empty/loading states.
- **Interactive Visualizations**: Real-time charts powered by Chart.js (headcount distribution, daily attendance, departmental spending, payroll trends).
- **Role-Based Demo Authentication**: Easily switch between **System Admin** (Full Access), **HR Manager** (Operations), and **Employee Self-Service** with one click.
- **Complete HR Lifecycle**:
  - Employee Master Management (Full CRUD, profile inspector, search & filters)
  - Daily Attendance Tracking (duplicate-prevention, quick mark actions, live totals)
  - Leave Application & Approval Workflow (Sick, Casual, Annual leave balances)
  - Automated Payroll Engine (auto HRA/DA calculation, PF 12%, TDS 8%, printable official payslips)
  - Department Division Management (leadership, staff count, budgets)
  - Institutional Reports & 1-Click CSV Export
  - Employee Self-Service Workspace (personal clock-in, leave quotas, personal payslips)
- **Zero Heavy Frameworks**: No React, MongoDB, Docker, or TypeScript required. Easy to explain line-by-line during college viva.
- **Offline-Friendly Demo**: Bootstrap, Bootstrap Icons, and Chart.js are installed locally through npm; the application does not require cloud services or API keys.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend UI** | HTML5, CSS3, Vanilla JavaScript | Responsive Single Page Application (SPA) architecture |
| **Styling** | Bootstrap 5.3 + Bootstrap Icons | Modern corporate design system & responsive layout |
| **Data Visuals** | Chart.js 4.4 | Interactive donut, bar, and trend charts |
| **Backend Server** | Node.js with Express.js | Clean REST API endpoints and static asset serving |
| **Database** | SQLite3 (`hrms.db`) | Local persistent relational database with automatic seed data |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18, v20, v22, or v24 installed)
- Web browser (Chrome, Edge, Firefox, or Safari)

### 1. Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### 2. Launch the Application
Start the server using:
```bash
npm start
```
*(Alternative for development with auto-reload: `npm run dev`)*

### 3. Run the Verification Suite

The tests use a disposable temporary SQLite database and do not modify `database/hrms.db`:

```bash
npm test
```

### 4. Open in Browser
Navigate to:
```
http://localhost:3000
```
The database will automatically seed **20 realistic employees, 5 departments, attendance history, leave requests, and payroll records** on the very first run!

---

## 📁 Project Directory Structure

```
hcl project/
├── database/
│   ├── db.js                 # SQLite connection, schema definition & sample data seeder
│   └── hrms.db               # SQLite database file (created automatically)
├── public/
│   ├── css/
│   │   └── style.css         # Custom corporate styles & printable payslip print rules
│   ├── js/
│   │   ├── api.js            # Frontend REST API client
│   │   ├── app.js            # App coordinator, role switcher & toast notifications
│   │   ├── dashboard.js      # Executive dashboard metrics & Chart.js charts
│   │   ├── employees.js      # Employee CRUD, profile modal, search & filters
│   │   ├── departments.js    # Department management & budget tracking
│   │   ├── attendance.js     # Daily roll call, quick mark & duplicate prevention
│   │   ├── leaves.js         # Leave requests, review approval/rejection
│   │   ├── payroll.js        # Salary calculations, batch generator & payslip modal
│   │   ├── reports.js        # Tabulated reports & 1-click CSV download
│   │   └── selfservice.js    # Dedicated employee personal portal
│   └── index.html            # Main Single Page Application interface
├── routes/
│   ├── auth.js               # Demo role switcher endpoints
│   ├── dashboard.js          # Statistics and analytics endpoints
│   ├── employees.js          # Employee CRUD endpoints
│   ├── departments.js        # Department CRUD endpoints
│   ├── attendance.js         # Daily attendance endpoints
│   ├── leaves.js             # Leave workflow endpoints
│   ├── payroll.js            # Payroll calculations & payslip endpoints
│   └── reports.js            # CSV export & reporting endpoints
├── tests/
│   └── integration.test.js   # End-to-end REST workflow tests using a temporary database
├── utils/
│   └── validation.js         # Shared date, number, ID, and text validation helpers
├── package.json              # Project metadata & npm scripts
├── README.md                 # Project overview and run instructions
├── PROJECT_EXPLANATION.md    # Beginner-friendly system walkthrough
├── DATABASE_SCHEMA.md        # Relational database tables and ER explanation
└── PRESENTATION_GUIDE.md     # 5-10 min demo script & 15 viva Q&As
```

---

## 🎭 Role-Based Demo Modes

Click **"Switch Demo Role"** in the top bar or sidebar anytime during a presentation:
1. **System Admin**: Complete control over all master data, employee CRUD, salary configurations, and audit logs.
2. **HR Manager (Anita Verma)**: Manage employees, review and approve/reject leave requests, mark attendance, and generate payroll batches.
3. **Employee Self-Service (e.g. Aarav Patel / Priya Nair)**: Restricted personal workspace where employees can clock in, check remaining leave quotas, apply for leaves, and print official payslips.

---

## 📄 Documentation Files

- [PROJECT_EXPLANATION.md](PROJECT_EXPLANATION.md) — Line-by-line explanation of how the system works.
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — Comprehensive schema definitions, constraints, and relationships.
- [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md) — Script for a 5–10 minute demonstration and viva questions.
