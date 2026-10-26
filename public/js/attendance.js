// Attendance Module
const Attendance = {
  currentDate: null,

  init: async () => {
    if (!Attendance.currentDate) Attendance.currentDate = App.getLocalISODate();
    // Set date input to today
    const dateInput = document.getElementById('att-date-picker');
    if (dateInput) {
      dateInput.value = Attendance.currentDate;
      dateInput.addEventListener('change', (e) => {
        Attendance.currentDate = e.target.value;
        Attendance.loadDateAttendance();
      });
    }

    await Promise.all([
      Attendance.loadDateAttendance(),
      Attendance.populateEmployeeSelect()
    ]);
  },

  populateEmployeeSelect: async () => {
    try {
      const res = await API.getEmployees({ status: 'Active' });
      const sel = document.getElementById('att-form-emp');
      if (sel && res.success) {
        sel.innerHTML = '<option value="">-- Choose Employee --</option>' +
          res.employees.map(e => `<option value="${e.id}">${e.employee_code} - ${e.first_name} ${e.last_name} (${e.department_name || 'N/A'})</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to populate employee select in attendance:', err);
    }
  },

  loadDateAttendance: async () => {
    try {
      const res = await API.getTodayAttendance(Attendance.currentDate);
      if (!res.success) return;

      const s = res.summary;
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };

      setTxt('att-summary-total', s.total);
      setTxt('att-summary-present', s.presentCount);
      setTxt('att-summary-absent', s.absentCount);
      setTxt('att-summary-late', s.lateCount);
      setTxt('att-summary-halfday', s.halfDayCount);
      setTxt('att-summary-notmarked', s.notMarkedCount);

      const tbody = document.getElementById('attendance-table-body');
      if (!tbody) return;

      if (res.records.length === 0) {
        tbody.innerHTML = App.emptyRow(7, 'No attendance records', `Nothing is recorded for ${Attendance.currentDate}.`);
        return;
      }

      tbody.innerHTML = res.records.map(r => {
        let statusBadge = '<span class="badge bg-secondary">Not Marked</span>';
        if (r.status === 'Present') statusBadge = '<span class="badge badge-status badge-present"><i class="bi bi-check-circle me-1"></i>Present</span>';
        else if (r.status === 'Absent') statusBadge = '<span class="badge badge-status badge-absent"><i class="bi bi-x-circle me-1"></i>Absent</span>';
        else if (r.status === 'Late') statusBadge = '<span class="badge badge-status badge-late"><i class="bi bi-clock-history me-1"></i>Late</span>';
        else if (r.status === 'Half Day') statusBadge = '<span class="badge badge-status badge-halfday"><i class="bi bi-pie-chart me-1"></i>Half Day</span>';

        return `
          <tr>
            <td class="fw-semibold text-primary">${App.escapeHtml(r.employee_code)}</td>
            <td>
              <div class="fw-semibold text-dark">${App.escapeHtml(r.first_name)} ${App.escapeHtml(r.last_name)}</div>
              <div class="text-muted small" style="font-size: 0.72rem;">${App.escapeHtml(r.designation)}</div>
            </td>
            <td>${r.department_name ? App.escapeHtml(r.department_name) : '<span class="text-muted">Unassigned</span>'}</td>
            <td>${r.clock_in ? App.escapeHtml(r.clock_in) : '<span class="text-muted">--:--</span>'}</td>
            <td>${r.clock_out ? App.escapeHtml(r.clock_out) : '<span class="text-muted">--:--</span>'}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-success btn-sm" title="Mark Present" onclick="Attendance.quickMark(${r.employee_id}, 'Present')">
                  <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-outline-warning btn-sm" title="Mark Late" onclick="Attendance.quickMark(${r.employee_id}, 'Late')">
                  <i class="bi bi-clock"></i>
                </button>
                <button class="btn btn-outline-info btn-sm" title="Mark Half-Day" onclick="Attendance.quickMark(${r.employee_id}, 'Half Day')">
                  <i class="bi bi-pie-chart"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" title="Mark Absent" onclick="Attendance.quickMark(${r.employee_id}, 'Absent')">
                  <i class="bi bi-x-lg"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm" title="Edit details" onclick="Attendance.openDetailModal(${r.employee_id}, ${App.escapeHtml(JSON.stringify(r.status))}, ${App.escapeHtml(JSON.stringify(r.clock_in || ''))}, ${App.escapeHtml(JSON.stringify(r.clock_out || ''))}, ${App.escapeHtml(JSON.stringify(r.notes || ''))})">
                  <i class="bi bi-three-dots"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load attendance:', err);
      App.showToast(err.message || 'Attendance could not be loaded.', 'danger');
    }
  },

  quickMark: async (employeeId, status) => {
    try {
      const res = await API.markAttendance({
        employee_id: employeeId,
        date: Attendance.currentDate,
        status: status,
        allow_override: true,
        userRole: App.currentRoleName
      });

      if (res.success) {
        App.showToast(res.message, 'success');
        await Attendance.loadDateAttendance();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to quick mark attendance:', err);
      App.showToast(err.message || 'Attendance could not be updated.', 'danger');
    }
  },

  openDetailModal: (empId, status, inTime, outTime, notes) => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('att-form-emp', empId);
    setVal('att-form-date', Attendance.currentDate);
    setVal('att-form-status', status && status !== 'Not Marked' ? status : 'Present');
    setVal('att-form-in', inTime);
    setVal('att-form-out', outTime);
    setVal('att-form-notes', notes);

    const modalEl = document.getElementById('modal-mark-attendance');
    if (modalEl) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  },

  saveAttendanceForm: async (e) => {
    e.preventDefault();
    const payload = {
      employee_id: document.getElementById('att-form-emp').value,
      date: document.getElementById('att-form-date').value,
      status: document.getElementById('att-form-status').value,
      clock_in: document.getElementById('att-form-in').value.trim() || undefined,
      clock_out: document.getElementById('att-form-out').value.trim() || undefined,
      notes: document.getElementById('att-form-notes').value.trim(),
      allow_override: true,
      userRole: App.currentRoleName
    };

    if (!payload.employee_id) {
      return App.showToast('Please select an employee.', 'warning');
    }

    try {
      const res = await API.markAttendance(payload);
      if (res.success) {
        App.showToast(res.message, 'success');
        const modalEl = document.getElementById('modal-mark-attendance');
        bootstrap.Modal.getInstance(modalEl).hide();
        await Attendance.loadDateAttendance();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to submit attendance form:', err);
      App.showToast(err.message || 'Attendance could not be saved.', 'danger');
    }
  }
};
