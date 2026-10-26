// Payroll Module
const Payroll = {
  selectedMonth: 'all',

  init: async () => {
    await Payroll.loadPayrollRecords();
  },

  loadPayrollRecords: async () => {
    try {
      const month = document.getElementById('payroll-filter-month')?.value || 'all';
      const status = document.getElementById('payroll-filter-status')?.value || 'all';

      const res = await API.getPayroll({ month_year: month, status });
      if (!res.success) return;

      // Populate month filter dropdown if not already done
      const filterSelect = document.getElementById('payroll-filter-month');
      if (filterSelect && filterSelect.options.length <= 1 && res.availableMonths) {
        res.availableMonths.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.innerText = m;
          filterSelect.appendChild(opt);
        });
      }

      // Load summary
      const sumRes = await API.getPayrollSummary(month);
      if (sumRes.success && sumRes.summary) {
        const s = sumRes.summary;
        const setTxt = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };
        setTxt('payroll-stat-gross', `₹${Math.round(s.totalGross || 0).toLocaleString('en-IN')}`);
        setTxt('payroll-stat-net', `₹${Math.round(s.totalNet || 0).toLocaleString('en-IN')}`);
        setTxt('payroll-stat-paid', `₹${Math.round(s.totalPaid || 0).toLocaleString('en-IN')} (${s.countPaid || 0} staff)`);
        setTxt('payroll-stat-pending', `₹${Math.round(s.totalPending || 0).toLocaleString('en-IN')} (${s.countPending || 0} staff)`);
      }

      const tbody = document.getElementById('payroll-table-body');
      if (!tbody) return;

      if (res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(9, 'No payroll records', 'Run payroll for a month or adjust the filters.');
        return;
      }

      tbody.innerHTML = res.records.map(p => {
        const isPaid = p.payment_status === 'Paid';
        const statusBadge = isPaid
          ? '<span class="badge badge-status badge-paid"><i class="bi bi-check-circle me-1"></i>Paid</span>'
          : '<span class="badge badge-status badge-pending"><i class="bi bi-clock me-1"></i>Pending</span>';

        return `
          <tr>
            <td class="fw-bold text-primary">${App.escapeHtml(p.employee_code)}</td>
            <td>
              <div class="fw-semibold text-dark">${App.escapeHtml(p.first_name)} ${App.escapeHtml(p.last_name)}</div>
              <div class="text-muted small" style="font-size: 0.72rem;">${App.escapeHtml(p.designation)} • ${App.escapeHtml(p.department_name || 'N/A')}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${App.escapeHtml(p.month_year)}</span></td>
            <td>₹${p.basic_salary.toLocaleString('en-IN')}</td>
            <td>₹${p.gross_salary.toLocaleString('en-IN')}</td>
            <td class="text-danger small">₹${p.deductions.toLocaleString('en-IN')}</td>
            <td><span class="fw-bold text-success">₹${p.net_salary.toLocaleString('en-IN')}</span></td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-primary me-1" title="Generate / View Payslip" onclick="Payroll.viewPayslip(${p.id})">
                <i class="bi bi-file-earmark-text me-1"></i>Payslip
              </button>
              <button class="btn btn-sm btn-outline-secondary" title="Toggle Status" onclick="Payroll.toggleStatus(${p.id}, '${isPaid ? 'Pending' : 'Paid'}')">
                <i class="bi bi-arrow-repeat"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load payroll:', err);
      App.showToast(err.message || 'Payroll records could not be loaded.', 'danger');
    }
  },

  openGenerateModal: () => {
    // Default current month
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('payroll-gen-month').value = monthName;
    document.getElementById('payroll-gen-date').value = App.getLocalISODate(now);

    const modalEl = document.getElementById('modal-generate-payroll');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  },

  submitGeneratePayroll: async (e) => {
    e.preventDefault();
    const month_year = document.getElementById('payroll-gen-month').value.trim();
    const pay_date = document.getElementById('payroll-gen-date').value;

    if (!month_year) {
      return App.showToast('Please provide month and year.', 'warning');
    }

    try {
      const res = await API.generatePayroll({
        month_year,
        pay_date,
        userRole: App.currentRoleName
      });

      if (res.success) {
        App.showToast(res.message, 'success');
        const modalEl = document.getElementById('modal-generate-payroll');
        bootstrap.Modal.getInstance(modalEl).hide();
        await Payroll.loadPayrollRecords();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to generate payroll:', err);
      App.showToast(err.message || 'Payroll batch could not be processed.', 'danger');
    }
  },

  toggleStatus: async (id, newStatus) => {
    try {
      const res = await API.updatePayrollStatus(id, newStatus, App.currentRoleName);
      if (res.success) {
        App.showToast(res.message, 'success');
        await Payroll.loadPayrollRecords();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to update payroll status:', err);
      App.showToast(err.message || 'Payroll status could not be updated.', 'danger');
    }
  },

  viewPayslip: async (id) => {
    try {
      const res = await API.getPayslip(id);
      if (!res.success) return App.showToast(res.message, 'danger');

      const { company, payslip } = res;
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };

      // Header
      setTxt('payslip-company-name', company.name);
      setTxt('payslip-company-addr', `${company.address}, ${company.city} | ${company.phone}`);
      setTxt('payslip-title', `SALARY PAYSLIP - ${payslip.month_year.toUpperCase()}`);

      // Employee Info
      setTxt('payslip-emp-name', `${payslip.first_name} ${payslip.last_name}`);
      setTxt('payslip-emp-code', payslip.employee_code);
      setTxt('payslip-emp-desig', payslip.designation);
      setTxt('payslip-emp-dept', payslip.department_name || 'N/A');
      setTxt('payslip-emp-joining', payslip.joining_date);
      setTxt('payslip-pay-date', payslip.pay_date);
      setTxt('payslip-pay-method', payslip.payment_method);
      setTxt('payslip-status-badge', payslip.payment_status);

      // Earnings Table
      setTxt('payslip-basic', `₹${payslip.basic_salary.toLocaleString('en-IN')}`);
      setTxt('payslip-hra', `₹${payslip.hra.toLocaleString('en-IN')}`);
      setTxt('payslip-da', `₹${payslip.da.toLocaleString('en-IN')}`);
      setTxt('payslip-allow', `₹${payslip.allowances.toLocaleString('en-IN')}`);
      setTxt('payslip-gross', `₹${payslip.gross_salary.toLocaleString('en-IN')}`);

      // Deductions Table
      setTxt('payslip-pf', `₹${payslip.pf.toLocaleString('en-IN')}`);
      setTxt('payslip-tax', `₹${payslip.tax.toLocaleString('en-IN')}`);
      const otherDeds = payslip.deductions - (payslip.pf + payslip.tax);
      setTxt('payslip-other-ded', `₹${Math.max(0, otherDeds).toLocaleString('en-IN')}`);
      setTxt('payslip-total-ded', `₹${payslip.deductions.toLocaleString('en-IN')}`);

      // Net
      setTxt('payslip-net-amount', `₹${payslip.net_salary.toLocaleString('en-IN')}`);

      const modalEl = document.getElementById('modal-view-payslip');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (err) {
      console.error('Failed to view payslip:', err);
      App.showToast(err.message || 'Payslip could not be loaded.', 'danger');
    }
  },

  printPayslip: () => {
    window.print();
  }
};
