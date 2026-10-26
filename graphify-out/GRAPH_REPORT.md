# Graph Report - hcl project  (2026-10-26)

## Corpus Check
- Corpus is ~24,156 words - fits in a single context window. You may not need a graph.

## Summary
- 86 nodes · 127 edges · 20 communities (6 shown, 14 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Package & Project Configuration
- Auth, RBAC & Core Routing Engine
- Server Bootstrap & Documentation
- Database Schema & Seeding
- SQLite Connection & Driver
- Employee Management & Activity Logging
- Dashboard Metrics & Statistics API
- Attendance Management API
- Department Management API
- Leave Requests API
- Dashboard Frontend Views
- Employee Directory Frontend
- Payroll Frontend Management
- Single Page App UI Shell
- Client API Communication Layer
- Attendance Tracking UI
- Department Directory UI
- Leave Management UI
- Reports & Export Frontend
- Employee Self-Service UI

## God Nodes (most connected - your core abstractions)
1. `express` - 11 edges
2. `dbQuery()` - 9 edges
3. `dbRun()` - 9 edges
4. `dbGet()` - 8 edges
5. `logActivity()` - 8 edges
6. `initDatabase()` - 8 edges
7. `seedDatabase()` - 3 edges
8. `scripts` - 3 edges
9. `cors` - 3 edges
10. `router` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Activity Logs Table Schema` --conceptually_related_to--> `logActivity()`  [EXTRACTED]
  DATABASE_SCHEMA.md → database/db.js
- `Employees Table Schema` --implements--> `initDatabase()`  [EXTRACTED]
  DATABASE_SCHEMA.md → database/db.js
- `Users Table Schema` --implements--> `initDatabase()`  [EXTRACTED]
  DATABASE_SCHEMA.md → database/db.js
- `Attendance Table Schema` --conceptually_related_to--> `router`  [INFERRED]
  DATABASE_SCHEMA.md → routes/attendance.js
- `Role-Based Access Control Concept` --conceptually_related_to--> `router`  [INFERRED]
  PROJECT_EXPLANATION.md → routes/auth.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dayflow Core HR Management Subsystems** — routes_employees_router, routes_attendance_router, routes_payroll_router, routes_leaves_router [INFERRED 0.95]

## Communities (20 total, 14 thin omitted)

### Community 0 - "Package & Project Configuration"
Cohesion: 0.13
Nodes (16): author, dependencies, cors@^2.8.5, express@^4.21.2, sqlite3@^6.0.1, description, keywords, license (+8 more)

### Community 1 - "Auth, RBAC & Core Routing Engine"
Cohesion: 0.20
Nodes (8): dbQuery(), Payroll Table Schema, Role-Based Access Control Concept, Salary Calculation Engine, express, router, router, router

### Community 2 - "Server Bootstrap & Documentation"
Cohesion: 0.25
Nodes (6): Presentation Live Demo Script, Viva Technical QA Guide, Dayflow Full-Stack Architecture, Dayflow HRMS Overview, app, startServer()

### Community 3 - "Database Schema & Seeding"
Cohesion: 0.50
Nodes (5): dbRun(), initDatabase(), seedDatabase(), Employees Table Schema, Users Table Schema

### Community 4 - "SQLite Connection & Driver"
Cohesion: 0.50
Nodes (3): db, DB_PATH, sqlite3

### Community 5 - "Employee Management & Activity Logging"
Cohesion: 0.50
Nodes (3): logActivity(), Activity Logs Table Schema, router

## Knowledge Gaps
- **15 isolated node(s):** `Users Table Schema`, `Employees Table Schema`, `Departments Table Schema`, `Attendance Table Schema`, `Leaves Table Schema` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 47 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Auth, RBAC & Core Routing Engine` to `Package & Project Configuration`, `Server Bootstrap & Documentation`, `Employee Management & Activity Logging`, `Dashboard Metrics & Statistics API`, `Attendance Management API`, `Department Management API`, `Leave Requests API`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **What connects `Users Table Schema`, `Employees Table Schema`, `Departments Table Schema` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package & Project Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `initDatabase()` connect `Database Schema & Seeding` to `Server Bootstrap & Documentation`, `SQLite Connection & Driver`, `Dashboard Metrics & Statistics API`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `cors` connect `Package & Project Configuration` to `Server Bootstrap & Documentation`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._