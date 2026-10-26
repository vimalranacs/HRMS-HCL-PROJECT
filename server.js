const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const reportRoutes = require('./routes/reports');

const PORT = process.env.PORT || 3000;

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: true, limit: '250kb' }));

  // Serve the app and its existing UI libraries locally for an offline demo.
  app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
  app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules', 'bootstrap-icons')));
  app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/reports', reportRoutes);

  // API requests should never receive the SPA HTML by mistake.
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

// Startup sequence
async function startServer(port = PORT) {
  try {
    await initDatabase();
    const app = createApp();
    const server = app.listen(port, () => {
      console.log(`====================================================`);
      console.log(`   HRMS - Human Resource Management System          `);
      console.log(`   College Project: B.Tech CSE                      `);
      console.log(`====================================================`);
      console.log(` Server is running on: http://localhost:${server.address().port}`);
      console.log(` Ready for 5-10 minute project viva & live demo!   `);
      console.log(`====================================================`);
    });
    return server;
  } catch (err) {
    console.error('Fatal error starting HRMS server:', err);
    throw err;
  }
}

if (require.main === module) {
  startServer().catch(() => process.exit(1));
}

module.exports = { createApp, startServer };
