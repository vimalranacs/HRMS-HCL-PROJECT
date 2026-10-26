// Leaves Module
const Leaves = {
  currentFilter: 'all',

  init: async () => {
    await Promise.all([
      Leaves.loadLeaves(),
      Leaves.populateEmployeeSelect()
    ]);
  },

  populateEmployeeSelect: async () => {
    try {
      const res = await API.getEmployees({ status: 'Active' });
      const sel = document.getElementById('leave-form-emp');
      if (sel && res.success) {
        sel.innerHTML = '<option value="">-- Select Employee --</option>' +
          res.employees.map(e => `<option value="${e.id}">${App.escapeHtml(e.employee_code)} - ${App.escapeHtml(e.first_name)} ${App.escapeHtml(e.last_name)}</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to populate employee select in leaves:', err);
      App.showToast(err.message || 'Employee options could not be loaded.', 'danger');
    }
  },

  loadLeaves: async () => {
    try {
      const status = document.getElementById('leave-filter-status')?.value || 'all';
      const type = document.getElementById('leave-filter-type')?.value || 'all';

      const res = await API.getLeaves({ status, leave_type: type });
      const tbody = document.getElementById('leaves-table-body');
      if (!tbody) return;

      if (!res.success || res.leaves.length === 0) {
        tbody.innerHTML = App.emptyRow(8, 'No leave requests', 'No requests match the selected filters.');
        return;
      }

      tbody.innerHTML = res.leaves.map(l => {
        let badge = '<span class="badge badge-status badge-pending">Pending</span>';
        if (l.status === 'Approved') badge = '<span class="badge badge-status badge-approved"><i class="bi bi-check-circle me-1"></i>Approved</span>';
        else if (l.status === 'Rejected') badge = '<span class="badge badge-status badge-rejected"><i class="bi bi-x-circle me-1"></i>Rejected</span>';

        // Action buttons (only show Approve/Reject if user is Admin or HR Manager and status is Pending)
        const canManage = (App.currentRole === 'admin' || App.currentRole === 'hr_manager') && l.status === 'Pending';
        const actionsHtml = canManage
          ? `
            <button class="btn btn-sm btn-success me-1" title="Approve" onclick="Leaves.reviewLeave(${l.id}, 'Approved', ${App.escapeHtml(JSON.stringify(`${l.first_name} ${l.last_name}`))})">
              <i class="bi bi-check-lg"></i> Approve
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Reject" onclick="Leaves.reviewLeave(${l.id}, 'Rejected', ${App.escapeHtml(JSON.stringify(`${l.first_name} ${l.last_name}`))})">
              <i class="bi bi-x-lg"></i> Reject
            </button>
          `
          : `<span class="text-muted small">${App.escapeHtml(l.action_by || 'No action needed')}</span>`;

        return `
          <tr>
            <td class="fw-bold text-muted">#${l.id}</td>
            <td>
              <div class="fw-semibold text-dark">${App.escapeHtml(l.first_name)} ${App.escapeHtml(l.last_name)}</div>
              <div class="text-muted small" style="font-size: 0.75rem;">${App.escapeHtml(l.employee_code)} • ${App.escapeHtml(l.department_name || 'N/A')}</div>
            </td>
            <td><span class="badge bg-light text-primary border">${App.escapeHtml(l.leave_type)}</span></td>
            <td>
              <div>${l.start_date} to ${l.end_date}</div>
              <div class="fw-semibold text-dark small">${l.days_count} day(s)</div>
            </td>
            <td style="max-width: 200px;">
              <div class="text-truncate text-muted small" title="${App.escapeHtml(l.reason)}">${App.escapeHtml(l.reason)}</div>
            </td>
            <td><span class="text-muted small">${l.applied_on}</span></td>
            <td>${badge}</td>
            <td class="text-end">${actionsHtml}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load leaves:', err);
      App.showToast(err.message || 'Leave requests could not be loaded.', 'danger');
    }
  },

  openApplyModal: () => {
    document.getElementById('form-apply-leave').reset();
    // Default dates
    const today = App.getLocalISODate();
    document.getElementById('leave-form-start').value = today;
    document.getElementById('leave-form-end').value = today;

    // If logged in as Employee, auto select current employee
    if (App.currentRole === 'employee' && App.currentEmployeeId) {
      document.getElementById('leave-form-emp').value = App.currentEmployeeId;
    }

    const modalEl = document.getElementById('modal-apply-leave');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  },

  submitLeaveApplication: async (e) => {
    e.preventDefault();
    const payload = {
      employee_id: document.getElementById('leave-form-emp').value,
      leave_type: document.getElementById('leave-form-type').value,
      start_date: document.getElementById('leave-form-start').value,
      end_date: document.getElementById('leave-form-end').value,
      reason: document.getElementById('leave-form-reason').value.trim(),
      userRole: App.currentRoleName
    };

    if (!payload.employee_id || !payload.reason) {
      return App.showToast('Please fill all required leave application fields.', 'warning');
    }

    try {
      const res = await API.applyLeave(payload);
      if (res.success) {
        App.showToast(res.message, 'success');
        const modalEl = document.getElementById('modal-apply-leave');
        bootstrap.Modal.getInstance(modalEl).hide();
        await Leaves.loadLeaves();
        Dashboard.loadStats();
        // If in self service, reload self service leaves
        if (typeof SelfService !== 'undefined') SelfService.loadData();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to apply leave:', err);
      App.showToast(err.message || 'Leave request could not be submitted.', 'danger');
    }
  },

  reviewLeave: async (id, status, empName) => {
    const remarks = prompt(`Enter remarks for marking ${empName}'s leave as ${status}:`, status === 'Approved' ? 'Leave Approved' : 'Operational requirements');
    if (remarks === null) return; // User cancelled

    try {
      const res = await API.updateLeaveStatus(id, {
        status,
        action_remarks: remarks,
        userRole: App.currentRoleName
      });

      if (res.success) {
        App.showToast(res.message, 'success');
        await Leaves.loadLeaves();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to update leave status:', err);
      App.showToast(err.message || 'Leave status could not be updated.', 'danger');
    }
  }
};
