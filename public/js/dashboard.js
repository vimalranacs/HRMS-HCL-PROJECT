// Dashboard Module
const Dashboard = {
  charts: {},

  init: async () => {
    await Promise.all([
      Dashboard.loadStats(),
      Dashboard.loadCharts(),
      Dashboard.loadActivities()
    ]);
  },

  loadStats: async () => {
    try {
      const res = await API.getStats();
      if (!res.success) return;
      const d = res.data;

      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };

      setTxt('stat-total-emp', d.totalEmployees);
      setTxt('stat-active-emp', `${d.activeEmployees} Active`);
      setTxt('stat-present-today', d.presentToday);
      setTxt('stat-absent-today', `${d.absentToday} Absent, ${d.halfDayToday} Half-Day`);
      setTxt('stat-pending-leaves', d.pendingLeaves);
      setTxt('stat-monthly-payroll', `₹${d.monthlyPayroll.toLocaleString('en-IN')}`);
      setTxt('stat-payroll-count', `For ${d.payrollCount} employees`);
    } catch (err) {
      console.error('Failed to load stats:', err);
      App.showToast(err.message || 'Dashboard metrics could not be loaded.', 'danger');
    }
  },

  loadCharts: async () => {
    try {
      const res = await API.getCharts();
      if (!res.success) return;
      const { deptDistribution, attendanceBreakdown, deptSalary, payrollTrends } = res.charts;

      // 1. Department Distribution Doughnut Chart
      const ctxDept = document.getElementById('chart-departments');
      if (ctxDept) {
        if (Dashboard.charts.dept) Dashboard.charts.dept.destroy();
        Dashboard.charts.dept = new Chart(ctxDept, {
          type: 'doughnut',
          data: {
            labels: deptDistribution.map(d => d.department),
            datasets: [{
              data: deptDistribution.map(d => d.employeeCount),
              backgroundColor: ['#3157b7', '#267b64', '#b78025', '#9b5f40', '#6f5a9e'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
          }
        });
      }

      // 2. Attendance Status Breakdown Doughnut Chart
      const ctxAtt = document.getElementById('chart-attendance');
      if (ctxAtt) {
        if (Dashboard.charts.att) Dashboard.charts.att.destroy();
        Dashboard.charts.att = new Chart(ctxAtt, {
          type: 'doughnut',
          data: {
            labels: attendanceBreakdown.map(a => a.status),
            datasets: [{
              data: attendanceBreakdown.map(a => a.count),
              backgroundColor: ['#267b64', '#b84250', '#b78025', '#4d7790'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
          }
        });
      }

      // 3. Department Salary Cost Horizontal Bar
      const ctxSal = document.getElementById('chart-dept-salary');
      if (ctxSal) {
        if (Dashboard.charts.sal) Dashboard.charts.sal.destroy();
        Dashboard.charts.sal = new Chart(ctxSal, {
          type: 'bar',
          data: {
            labels: deptSalary.map(s => s.department),
            datasets: [{
              label: 'Gross Payroll (₹)',
              data: deptSalary.map(s => s.totalGross),
              backgroundColor: '#4068c9',
              borderRadius: 3
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                ticks: {
                  callback: val => '₹' + (val >= 1000 ? (val / 1000) + 'k' : val)
                }
              }
            }
          }
        });
      }

      // 4. Monthly Payroll Trends Line Chart
      const ctxTrend = document.getElementById('chart-payroll-trend');
      if (ctxTrend) {
        if (Dashboard.charts.trend) Dashboard.charts.trend.destroy();
        Dashboard.charts.trend = new Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: payrollTrends.map(p => p.month),
            datasets: [
              {
                label: 'Gross Salary (₹)',
                data: payrollTrends.map(p => p.totalGross),
                borderColor: '#3157b7',
                backgroundColor: 'rgba(49, 87, 183, 0.08)',
                fill: true,
                tension: 0.3
              },
              {
                label: 'Net Disbursed (₹)',
                data: payrollTrends.map(p => p.totalNet),
                borderColor: '#267b64',
                backgroundColor: 'rgba(38, 123, 100, 0.08)',
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
            },
            scales: {
              y: {
                ticks: {
                  callback: val => '₹' + (val >= 100000 ? (val / 100000).toFixed(1) + 'L' : val)
                }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('Failed to load charts:', err);
    }
  },

  loadActivities: async () => {
    try {
      const res = await API.getRecentActivities();
      if (!res.success) return;

      const container = document.getElementById('dashboard-activities-list');
      if (!container) return;

      if (res.activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div><i class="bi bi-activity"></i><strong>No recent activity</strong><span>Actions taken in the demo will appear here.</span></div></div>';
        return;
      }

      container.innerHTML = res.activities.map(act => {
        let dotColor = '#0d6efd';
        let badgeClass = 'bg-primary';

        if (act.action.includes('Leave')) {
          dotColor = '#ffc107';
          badgeClass = 'bg-warning text-dark';
        } else if (act.action.includes('Payroll')) {
          dotColor = '#198754';
          badgeClass = 'bg-success';
        } else if (act.action.includes('Delete')) {
          dotColor = '#dc3545';
          badgeClass = 'bg-danger';
        }

        return `
          <div class="activity-item">
            <div class="activity-dot" style="background-color: ${dotColor};"></div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center justify-content-between mb-1">
                <span class="fw-semibold text-dark" style="font-size: 0.88rem;">${App.escapeHtml(act.action)}</span>
                <span class="badge ${badgeClass}" style="font-size: 0.7rem;">${App.escapeHtml(act.user_role || 'System')}</span>
              </div>
              <div class="text-muted" style="font-size: 0.82rem;">${App.escapeHtml(act.details)}</div>
              <div class="text-muted small mt-1" style="font-size: 0.72rem;">
                <i class="bi bi-clock me-1"></i>${App.escapeHtml(act.timestamp)}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  }
};
