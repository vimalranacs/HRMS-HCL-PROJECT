// Employee Self-Service Module
const SelfService = {
  currentEmp: null,

  init: async () => {
    await SelfService.loadData();
  },

  loadData: async () => {
    if (!App.currentEmployeeId) return;

    try {
      const res = await API.getEmployee(App.currentEmployeeId);
      if (!res.success) return;
      SelfService.currentEmp = res.employee;
      const emp = res.employee;

      // Fill profile section
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };

      setTxt('self-emp-name', `${emp.first_name} ${emp.last_name}`);
      setTxt('self-emp-code', emp.employee_code);
      setTxt('self-emp-desig', emp.designation);
      setTxt('self-emp-dept', emp.department_name || 'N/A');
      setTxt('self-emp-email', emp.email);
      setTxt('self-emp-phone', emp.phone || 'N/A');
      setTxt('self-emp-joining', emp.joining_date);

      // Load attendance stats & history
      const attRes = await API.getEmployeeAttendance(emp.id);
      if (attRes.success) {
        setTxt('self-att-present', attRes.stats.presentDays || 0);
        setTxt('self-att-late', attRes.stats.lateDays || 0);
        setTxt('self-att-absent', attRes.stats.absentDays || 0);

        // Render attendance table
        const tbody = document.getElementById('self-att-tbody');
        if (tbody) {
          if (attRes.history.length === 0) {
            tbody.innerHTML = App.emptyRow(4, 'No attendance history', 'Your recent attendance will appear here.');
          } else {
            tbody.innerHTML = attRes.history.slice(0, 7).map(a => `
              <tr>
                <td>${a.date}</td>
                <td>${a.clock_in || '--:--'}</td>
                <td>${a.clock_out || '--:--'}</td>
                <td><span class="badge ${a.status === 'Present' ? 'bg-success' : (a.status === 'Late' ? 'bg-warning text-dark' : 'bg-danger')}">${a.status}</span></td>
              </tr>
            `).join('');
          }
        }
      }

      // Load leaves & balances
      const leaveRes = await API.getEmployeeLeaves(emp.id);
      if (leaveRes.success) {
        const b = leaveRes.balances;
        setTxt('self-bal-sick', `${b.sick.remaining} / ${b.sick.allowed} Days`);
        setTxt('self-bal-casual', `${b.casual.remaining} / ${b.casual.allowed} Days`);
        setTxt('self-bal-annual', `${b.annual.remaining} / ${b.annual.allowed} Days`);

        const leaveTbody = document.getElementById('self-leaves-tbody');
        if (leaveTbody) {
          if (leaveRes.leaves.length === 0) {
            leaveTbody.innerHTML = App.emptyRow(5, 'No leave requests', 'Your submitted requests will appear here.');
          } else {
            leaveTbody.innerHTML = leaveRes.leaves.slice(0, 5).map(l => `
              <tr>
                <td><span class="badge bg-light text-primary border">${l.leave_type}</span></td>
                <td>${l.start_date} to ${l.end_date}</td>
                <td>${l.days_count} d</td>
                <td><span class="badge ${l.status === 'Approved' ? 'bg-success' : (l.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark')}">${l.status}</span></td>
                <td class="text-muted small">${l.action_remarks || 'Awaiting HR Review'}</td>
              </tr>
            `).join('');
          }
        }
      }

      // Load payslips
      const payRes = await API.getEmployeePayroll(emp.id);
      if (payRes.success) {
        const payTbody = document.getElementById('self-payslip-tbody');
        if (payTbody) {
          if (payRes.records.length === 0) {
            payTbody.innerHTML = App.emptyRow(5, 'No payslips yet', 'Issued monthly payslips will appear here.');
          } else {
            payTbody.innerHTML = payRes.records.map(p => `
              <tr>
                <td class="fw-semibold text-dark">${p.month_year}</td>
                <td>₹${p.gross_salary.toLocaleString('en-IN')}</td>
                <td class="fw-bold text-success">₹${p.net_salary.toLocaleString('en-IN')}</td>
                <td><span class="badge ${p.payment_status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}">${p.payment_status}</span></td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" onclick="Payroll.viewPayslip(${p.id})">
                    <i class="bi bi-printer me-1"></i>View Payslip
                  </button>
                </td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load self service data:', err);
      App.showToast(err.message || 'Self-service data could not be loaded.', 'danger');
    }
  },

  clockInToday: async () => {
    if (!App.currentEmployeeId) return;
    try {
      const today = App.getLocalISODate();
      const res = await API.markAttendance({
        employee_id: App.currentEmployeeId,
        date: today,
        status: 'Present',
        allow_override: true,
        userRole: 'Employee'
      });

      if (res.success) {
        App.showToast('You have successfully clocked in for today!', 'success');
        await SelfService.loadData();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to clock in:', err);
      App.showToast(err.message || 'Clock-in could not be completed.', 'danger');
    }
  }
};
