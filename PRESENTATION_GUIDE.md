# HRMS Project Presentation & College Viva Guide
**B.Tech 3rd Year CSE Capstone / Mini-Project Evaluation**

This guide is designed to help you ace your **5–10 minute project presentation** and confidently answer any technical or conceptual questions asked by your viva examiners.

---

## 1. 5–10 Minute Presentation Script

### Step 1: Introduction (1 Minute)
> "Good morning / afternoon, respected examiners and faculty members. My name is [Your Name], and today I am presenting my 3rd-year computer science project: a **Comprehensive Human Resource Management System (HRMS)**.
>
> In any modern corporate enterprise, managing workforce records, tracking daily biometric attendance, resolving leave applications, and calculating monthly payroll with taxes and statutory deductions manually using spreadsheets is slow, error-prone, and insecure. 
>
> To solve this, I designed and developed a centralized, lightweight web application using **HTML5, Vanilla JavaScript, Bootstrap 5, Node.js with Express, and SQLite3**."

---

### Step 2: System Architecture & Tech Stack (1.5 Minutes)
> "Our application follows a **3-Tier Client-Server Architecture**:
> 1. **Presentation Layer**: Built with pure HTML, modern CSS, and Vanilla JavaScript, enhanced by Bootstrap 5 for a clean corporate design and Chart.js for real-time visual analytics.
> 2. **Application Layer**: A Node.js backend using Express.js implementing a RESTful API architecture. It handles business logic such as duplicate attendance prevention, leave balance deductions, and automated payroll computations.
> 3. **Data Layer**: An embedded SQLite3 relational database. SQLite was selected because it is serverless, zero-configuration, ACID-compliant, and stores all tables in a single local database file (`hrms.db`)."

---

### Step 3: Live Demonstration Workflow (4–5 Minutes)

Follow these exact steps on your laptop during the demo:

#### A. Executive Dashboard
1. Open `http://localhost:3000`.
2. Point out the top 4 metric cards: **Total Employees (20)**, **Today's Attendance (17 Present, 2 Absent, 1 Late)**, **Pending Leaves (4)**, and **Monthly Payroll Expense**.
3. Point to the **Chart.js interactive charts**: Department Headcount distribution, Daily Attendance donut chart, and Monthly Payroll trend lines.
4. Point to the **Recent Activities Feed**, showing an automated audit trail.

#### B. Employee Management (CRUD & Filters)
1. Click **Employees** in the sidebar.
2. Show the search bar: type `"Priya"` or `"ENG"` to demonstrate instant client-side and server-side filtering.
3. Click the **Eye icon** on any employee row to open the **Employee Profile Record Modal**, showing personal data, salary breakdown, and past attendance statistics.
4. Click **Add New Employee**, fill in a test employee, and click Save. Show how the employee table and dashboard counters immediately refresh!

#### C. Daily Attendance Management & Duplicate Prevention
1. Click **Attendance** in the sidebar.
2. Explain how the system shows the roll call for the selected calendar date.
3. Click a quick status button (e.g. mark an employee from `Absent` to `Present`). Show how the counter badges update in real-time.
4. Explain: *"The database has a `UNIQUE(employee_id, date)` constraint that prevents accidental double entries for the same staff member."*

#### D. Leave Management & Approval Workflow
1. Click **Leave Requests** in the sidebar.
2. Filter by status: `Pending`.
3. Pick a pending leave request, click **Approve**, enter optional remarks, and submit.
4. Explain how this updates the status to `Approved` and logs an entry in the system activity audit trail.

#### E. Payroll Processing & Printable Payslips
1. Click **Payroll & Payslips** in the sidebar.
2. Point out the summary cards (Total Gross Pay, Net Disbursed, Amount Paid vs Pending).
3. Click **Run Monthly Payroll**: explain that it iterates through all active employees and computes:
   - Basic Salary
   - HRA (40%)
   - DA (20%)
   - PF (12% of Basic)
   - TDS Income Tax (8% of Gross)
   - Net Take-Home Pay
4. Click **Payslip** on any row to open the **Official Salary Payslip Modal**.
5. Point out the company header, itemized earnings vs deductions, and the **Print / Save PDF** button, which uses CSS `@media print` rules to generate a clean, professional PDF without headers or navigation bars.

#### F. Reports & CSV Export
1. Click **Reports & Export** in the sidebar.
2. Switch between the 4 report tabs: Employees, Attendance, Leaves, and Payroll.
3. Click the green **Export to CSV** button to show that it immediately downloads a standard CSV file directly to the computer.

#### G. Role-Based Demo Switcher & Employee Self-Service
1. Click **Switch Demo Role** in the top navigation bar.
2. Select **Employee Self-Service**, pick employee **Aarav Patel**, and click Apply.
3. Point out how the navigation automatically restricts admin tabs:
   - Aarav sees his own personal profile.
   - He can click **Clock In for Today** to mark his own biometric check-in.
   - He can see his live leave quota balances (e.g. 10/12 Sick leave days remaining).
   - He can view and print his own salary payslips without seeing other colleagues' private compensation.

---

### Step 4: Conclusion (30 Seconds)
> "In summary, this HRMS project demonstrates a complete, secure, full-stack relational web application that automates the core lifecycle of an organization's human capital. It was built using clean, modular code following software engineering best practices. Thank you, and I am now ready for your questions."

---

## 2. 15 Likely College Viva Questions & Answers

### Q1: Why did you choose SQLite instead of MongoDB or MySQL?
**Answer:** SQLite is an embedded, serverless relational database engine. Unlike MongoDB or MySQL, which require a separate database daemon process and external network configuration, SQLite stores the entire database in a single portable file (`hrms.db`). It natively supports standard SQL queries, ACID transactions, and foreign keys while being lightweight and fast for local enterprise applications.

---

### Q2: How does the application prevent duplicate attendance entries for the same day?
**Answer:** Prevention is enforced at both the database and application levels:
1. **Database Level**: The `attendance` table includes a composite unique constraint: `UNIQUE(employee_id, date)`.
2. **Application Level**: The Express route queries the table first; if an entry already exists for that employee on that date, it asks the user whether they want to update the existing record rather than inserting a duplicate.

---

### Q3: What is the difference between Gross Salary and Net Salary in your payroll module?
**Answer:** 
- **Gross Salary** is the total earnings before any deductions:
  $$\text{Gross} = \text{Basic Salary} + \text{HRA (House Rent)} + \text{DA (Dearness)} + \text{Allowances}$$
- **Net Salary** is the actual take-home pay received by the employee after subtracting statutory deductions:
  $$\text{Net} = \text{Gross Salary} - (\text{PF (12\%)} + \text{Income Tax TDS (8\%)} + \text{Other Deductions})$$

---

### Q4: What architecture does this web application follow?
**Answer:** It follows a **3-Tier Architecture**:
1. Presentation Layer (Frontend: HTML5, CSS3, Bootstrap 5, JavaScript).
2. Business Logic Layer (Backend: Node.js with Express.js REST API).
3. Data Persistence Layer (Database: SQLite3 relational database).
The frontend acts as a Single Page Application (SPA), dynamically updating views without full page reloads.

---

### Q5: What are REST APIs and how are they used in this project?
**Answer:** REST stands for Representational State Transfer. It is an architectural style for web services using standard HTTP verbs:
- `GET` to read data (e.g., fetching employee lists or statistics).
- `POST` to create new records (e.g., adding an employee or applying for leave).
- `PUT` to update an existing record (e.g., editing department info or approving a leave).
- `DELETE` to remove records (e.g., deleting an employee).
All communication transfers clean JSON payloads.

---

### Q6: How does the demo role-switching mechanism work without a real authentication backend?
**Answer:** Since this project is designed for college demonstration and viva evaluation without storing real sensitive passwords, we implemented a simulated session controller (`App.currentRole`). When a user switches roles (Admin, HR Manager, or Employee), the frontend dynamically adjusts sidebar navigation and view permissions. When Employee is selected, it links the session to a chosen employee ID to display only their personal profile, attendance, and payslips.

---

### Q7: What is CORS and why is it configured in `server.js`?
**Answer:** CORS stands for **Cross-Origin Resource Sharing**. It is a browser security mechanism that restricts web pages from making API requests to a different domain or port than the one that served the web page. In `server.js`, we use `cors()` middleware so the API can safely accept requests from client applications.

---

### Q8: What library did you use for the charts, and how does it receive data?
**Answer:** We used **Chart.js (version 4.4)**. The frontend makes an asynchronous `fetch()` call to `GET /api/dashboard/charts`. The backend executes SQL aggregation queries (`COUNT`, `SUM`, `GROUP BY`) and returns JSON arrays of labels and numerical values, which Chart.js binds to HTML5 `<canvas>` elements.

---

### Q9: What happens in the database if an employee is deleted?
**Answer:** We configured relational integrity rules in the SQL schema:
1. `attendance`, `leave_requests`, and `payroll` tables have foreign keys with `ON DELETE CASCADE`. When an employee is removed, their historical records are automatically deleted to prevent orphaned records.
2. In the `departments` table, if a department is deleted, the employee records set `department_id = NULL` (`ON DELETE SET NULL`), ensuring employee data is preserved.

---

### Q10: How does the CSV export feature work?
**Answer:** When the user clicks "Export to CSV", a request is made to `GET /api/reports/:type?exportCSV=true`. The server queries the database, formats the rows into standard comma-separated text strings with proper headers and quotes, and sets the HTTP response headers:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="report.csv"`
The browser automatically triggers a file download.

---

### Q11: How is the printable payslip generated without external PDF libraries?
**Answer:** We designed the payslip using semantic HTML and styled it using CSS `@media print` rules. When the user clicks "Print / Save PDF", `window.print()` is invoked. The print CSS makes the payslip modal fill the printed page while hiding the web navigation, background buttons, and backdrop, allowing the user to print directly or save as a pristine PDF using the browser's built-in print dialog.

---

### Q12: Why didn't you use React or Angular for this project?
**Answer:** While React and Angular are popular frameworks, they introduce build complexity (Webpack/Vite, JSX transpilation, heavy node_modules bundles, virtual DOM overhead). For this 3rd-year college project, using Vanilla JavaScript and Bootstrap 5 demonstrates a solid mastery of fundamental DOM manipulation, asynchronous JavaScript (`fetch`, `async/await`), and clean software architecture without framework abstraction.

---

### Q13: What is the purpose of the `activities` table?
**Answer:** The `activities` table acts as an **audit trail**. Whenever a state-changing action occurs (such as adding an employee, approving a leave, generating payroll, or updating attendance), the backend logs the user role, action title, timestamp, and details into the `activities` table. This provides accountability and enables the Recent Activity stream on the dashboard.

---

### Q14: How does the database automatically seed 20 employees and departments?
**Answer:** In `database/db.js`, during startup `initDatabase()` executes. It runs a `SELECT COUNT(*) FROM departments` query. If the count is 0 (first run on a fresh machine), the `seedDatabase()` function automatically executes SQL `INSERT` statements to populate 5 departments, 20 realistic employees, past attendance logs, leave requests, and payroll entries.

---

### Q15: What future enhancements could be added to this HRMS system?
**Answer:**
1. Integration with physical hardware biometric fingerprint / RFID scanners via WebSockets.
2. Real authentication with JSON Web Tokens (JWT) and bcrypt password hashing.
3. Automated email notifications for leave approvals and monthly salary slip dispatches using Nodemailer.
4. Performance appraisal and KPI review module.
