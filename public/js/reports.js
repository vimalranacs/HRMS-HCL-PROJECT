// Reports Module
const Reports = {
  currentTab: 'employees',

  init: async () => {
    await Reports.loadReport();
  },

  switchTab: (tabName) => {
    Reports.currentTab = tabName;
    document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`report-tab-${tabName}`)?.classList.add('active');

    document.querySelectorAll('.report-panel').forEach(p => p.classList.add('d-none'));
    document.getElementById(`report-panel-${tabName}`)?.classList.remove('d-none');

    Reports.loadReport();
  },

  loadReport: async () => {
    if (Reports.currentTab === 'employees') {
      await Reports.loadEmployeesReport();
    } else if (Reports.currentTab === 'attendance') {
      await Reports.loadAttendanceReport();
    } else if (Reports.currentTab === 'leaves') {
      await Reports.loadLeavesReport();
    } else if (Reports.currentTab === 'payroll') {
      await Reports.loadPayrollReport();
    }
  },

  loadEmployeesReport: async () => {
    try {
      const res = await API.getEmployeeReport();
      const tbody = document.getElementById('report-emp-tbody');
      if (!tbody) return;

      if (!res.success || res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(6, 'No employee report data', 'Employee records will appear here.');
        return;
      }

      tbody.innerHTML = res.records.map(r => `
        <tr>
          <td class="fw-semibold text-primary">${App.escapeHtml(r.employee_code)}</td>
          <td class="fw-semibold text-dark">${App.escapeHtml(r.full_name)}</td>
          <td>${App.escapeHtml(r.department || 'N/A')}</td>
          <td>${App.escapeHtml(r.designation)}</td>
          <td>₹${(r.basic_salary || 0).toLocaleString('en-IN')}</td>
          <td>₹${(r.gross_salary || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load employee report:', err);
      App.showToast(err.message || 'Employee report could not be loaded.', 'danger');
    }
  },

  loadAttendanceReport: async () => {
    try {
      const res = await API.getAttendanceReport();
      const tbody = document.getElementById('report-att-tbody');
      if (!tbody) return;

      if (!res.success || res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(7, 'No attendance report data', 'Attendance records will appear here.');
        return;
      }

      tbody.innerHTML = res.records.map(r => `
        <tr>
          <td>${App.escapeHtml(r.date)}</td>
          <td class="fw-semibold text-primary">${App.escapeHtml(r.employee_code)}</td>
          <td class="fw-semibold text-dark">${App.escapeHtml(r.full_name)}</td>
          <td>${App.escapeHtml(r.department || 'N/A')}</td>
          <td>${App.escapeHtml(r.clock_in || '--:--')}</td>
          <td>${App.escapeHtml(r.clock_out || '--:--')}</td>
          <td><span class="badge bg-light text-dark border">${App.escapeHtml(r.status)}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load attendance report:', err);
      App.showToast(err.message || 'Attendance report could not be loaded.', 'danger');
    }
  },

  loadLeavesReport: async () => {
    try {
      const res = await API.getLeaveReport();
      const tbody = document.getElementById('report-leave-tbody');
      if (!tbody) return;

      if (!res.success || res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(7, 'No leave report data', 'Leave records will appear here.');
        return;
      }

      tbody.innerHTML = res.records.map(r => `
        <tr>
          <td>#${r.id}</td>
          <td class="fw-semibold text-dark">${App.escapeHtml(r.full_name)} (${App.escapeHtml(r.employee_code)})</td>
          <td>${App.escapeHtml(r.department || 'N/A')}</td>
          <td><span class="badge bg-light text-primary border">${App.escapeHtml(r.leave_type)}</span></td>
          <td>${App.escapeHtml(r.start_date)} to ${App.escapeHtml(r.end_date)} (${r.days_count} d)</td>
          <td><span class="badge ${r.status === 'Approved' ? 'bg-success' : (r.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark')}">${App.escapeHtml(r.status)}</span></td>
          <td class="text-muted small">${App.escapeHtml(r.action_by || 'Pending')}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load leave report:', err);
      App.showToast(err.message || 'Leave report could not be loaded.', 'danger');
    }
  },

  loadPayrollReport: async () => {
    try {
      const res = await API.getPayrollReport();
      const tbody = document.getElementById('report-pay-tbody');
      if (!tbody) return;

      if (!res.success || res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(8, 'No payroll report data', 'Payroll records will appear here.');
        return;
      }

      tbody.innerHTML = res.records.map(r => `
        <tr>
          <td><span class="badge bg-light text-dark border">${App.escapeHtml(r.month_year)}</span></td>
          <td class="fw-semibold text-primary">${App.escapeHtml(r.employee_code)}</td>
          <td class="fw-semibold text-dark">${App.escapeHtml(r.full_name)}</td>
          <td>${App.escapeHtml(r.department || 'N/A')}</td>
          <td>₹${r.basic_salary.toLocaleString('en-IN')}</td>
          <td>₹${r.gross_salary.toLocaleString('en-IN')}</td>
          <td class="text-danger small">₹${r.deductions.toLocaleString('en-IN')}</td>
          <td class="fw-bold text-success">₹${r.net_salary.toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load payroll report:', err);
      App.showToast(err.message || 'Payroll report could not be loaded.', 'danger');
    }
  },

  exportCurrentCSV: () => {
    window.location.href = `/api/reports/${Reports.currentTab}?exportCSV=true`;
  }
};
