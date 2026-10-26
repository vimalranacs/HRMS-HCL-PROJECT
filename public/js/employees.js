// Employees Module
const Employees = {
  departmentsList: [],
  searchTimer: null,

  scheduleLoad: () => {
    window.clearTimeout(Employees.searchTimer);
    Employees.searchTimer = window.setTimeout(Employees.loadEmployees, 250);
  },

  init: async () => {
    await Promise.all([
      Employees.loadDepartmentOptions(),
      Employees.loadEmployees()
    ]);
  },

  loadDepartmentOptions: async () => {
    try {
      const res = await API.getDepartments();
      if (res.success) {
        Employees.departmentsList = res.departments;

        // Populate filter dropdown
        const filterSelect = document.getElementById('emp-filter-dept');
        if (filterSelect) {
          filterSelect.innerHTML = '<option value="all">All Departments</option>' +
            res.departments.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}</option>`).join('');
        }

        // Populate modal selects
        const modalSelect = document.getElementById('emp-form-dept');
        if (modalSelect) {
          modalSelect.innerHTML = '<option value="">-- Select Department --</option>' +
            res.departments.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}</option>`).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load departments for employee module:', err);
      App.showToast(err.message || 'Departments could not be loaded.', 'danger');
    }
  },

  loadEmployees: async () => {
    try {
      const search = document.getElementById('emp-search-input')?.value || '';
      const department = document.getElementById('emp-filter-dept')?.value || 'all';
      const status = document.getElementById('emp-filter-status')?.value || 'all';

      const res = await API.getEmployees({ search, department, status });
      const tbody = document.getElementById('employees-table-body');
      if (!tbody) return;

      if (!res.success || res.employees.length === 0) {
        tbody.innerHTML = App.emptyRow(7, 'No employees found', 'Adjust the filters or add a new employee.');
        return;
      }

      tbody.innerHTML = res.employees.map(emp => {
        const statusBadge = emp.status === 'Active'
          ? '<span class="badge badge-status badge-present">Active</span>'
          : `<span class="badge badge-status badge-absent">${App.escapeHtml(emp.status)}</span>`;

        const gross = (emp.basic_salary || 0) + (emp.hra || 0) + (emp.da || 0) + (emp.allowances || 0);

        return `
          <tr>
            <td>
              <div class="fw-semibold text-primary" style="cursor: pointer;" onclick="Employees.viewProfile(${emp.id})">
                ${App.escapeHtml(emp.employee_code)}
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <div class="avatar-circle me-2 bg-light text-primary fw-bold border" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                  ${App.escapeHtml(emp.first_name?.[0] || '')}${App.escapeHtml(emp.last_name?.[0] || '')}
                </div>
                <div>
                  <div class="fw-semibold text-dark">${App.escapeHtml(emp.first_name)} ${App.escapeHtml(emp.last_name)}</div>
                  <div class="text-muted small" style="font-size: 0.75rem;">${App.escapeHtml(emp.email)}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="badge bg-light text-dark border">${App.escapeHtml(emp.department_name || 'Unassigned')}</span>
            </td>
            <td>${App.escapeHtml(emp.designation)}</td>
            <td>
              <div class="fw-semibold">₹${gross.toLocaleString('en-IN')}</div>
              <div class="text-muted small" style="font-size: 0.72rem;">Basic: ₹${(emp.basic_salary || 0).toLocaleString('en-IN')}</div>
            </td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" title="View Profile" onclick="Employees.viewProfile(${emp.id})">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary me-1" title="Edit" onclick="Employees.openEditModal(${emp.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="Employees.deleteEmployee(${emp.id}, ${App.escapeHtml(JSON.stringify(`${emp.first_name} ${emp.last_name}`))})">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load employees:', err);
      App.showToast(err.message || 'Employees could not be loaded.', 'danger');
    }
  },

  viewProfile: async (id) => {
    try {
      const res = await API.getEmployee(id);
      if (!res.success) return App.showToast(res.message, 'danger');
      const emp = res.employee;
      const att = res.attendanceStats;

      const setText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
      };

      setText('profile-name', `${emp.first_name} ${emp.last_name}`);
      setText('profile-code', emp.employee_code);
      setText('profile-desig', emp.designation);
      setText('profile-dept', emp.department_name || 'Unassigned');
      setText('profile-email', emp.email);
      setText('profile-phone', emp.phone || 'N/A');
      setText('profile-gender', emp.gender || 'N/A');
      setText('profile-date', emp.joining_date);
      setText('profile-address', emp.address || 'N/A');
      setText('profile-status', emp.status);

      // Salary details
      const gross = emp.basic_salary + emp.hra + emp.da + emp.allowances;
      const totalDed = (Math.round(emp.basic_salary * 0.12)) + (Math.round(gross * 0.08)) + emp.deductions;
      const net = gross - totalDed;

      setText('profile-basic', `₹${emp.basic_salary.toLocaleString('en-IN')}`);
      setText('profile-hra', `₹${emp.hra.toLocaleString('en-IN')}`);
      setText('profile-da', `₹${emp.da.toLocaleString('en-IN')}`);
      setText('profile-allow', `₹${emp.allowances.toLocaleString('en-IN')}`);
      setText('profile-gross', `₹${gross.toLocaleString('en-IN')}`);
      setText('profile-net', `₹${net.toLocaleString('en-IN')}`);

      // Attendance summary
      setText('profile-att-present', att.presentDays || 0);
      setText('profile-att-absent', att.absentDays || 0);
      setText('profile-att-half', att.halfDays || 0);

      const modalEl = document.getElementById('modal-view-employee');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (err) {
      console.error('Failed to view profile:', err);
      App.showToast(err.message || 'Employee profile could not be loaded.', 'danger');
    }
  },

  openAddModal: () => {
    document.getElementById('emp-modal-title').innerText = 'Add New Employee';
    document.getElementById('form-employee').reset();
    document.getElementById('emp-form-id').value = '';
    const modalEl = document.getElementById('modal-employee-form');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  },

  openEditModal: async (id) => {
    try {
      const res = await API.getEmployee(id);
      if (!res.success) return App.showToast(res.message, 'danger');
      const emp = res.employee;

      document.getElementById('emp-modal-title').innerText = `Edit Employee (${emp.employee_code})`;
      document.getElementById('emp-form-id').value = emp.id;
      document.getElementById('emp-form-fn').value = emp.first_name;
      document.getElementById('emp-form-ln').value = emp.last_name;
      document.getElementById('emp-form-email').value = emp.email;
      document.getElementById('emp-form-phone').value = emp.phone || '';
      document.getElementById('emp-form-gender').value = emp.gender || 'Male';
      document.getElementById('emp-form-dept').value = emp.department_id || '';
      document.getElementById('emp-form-desig').value = emp.designation;
      document.getElementById('emp-form-date').value = emp.joining_date;
      document.getElementById('emp-form-basic').value = emp.basic_salary;
      document.getElementById('emp-form-hra').value = emp.hra;
      document.getElementById('emp-form-da').value = emp.da;
      document.getElementById('emp-form-allow').value = emp.allowances;
      document.getElementById('emp-form-ded').value = emp.deductions;
      document.getElementById('emp-form-status').value = emp.status;
      document.getElementById('emp-form-addr').value = emp.address || '';

      const modalEl = document.getElementById('modal-employee-form');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (err) {
      console.error('Failed to load employee for edit:', err);
      App.showToast(err.message || 'Employee details could not be loaded.', 'danger');
    }
  },

  saveEmployee: async (e) => {
    e.preventDefault();
    const id = document.getElementById('emp-form-id').value;

    const payload = {
      first_name: document.getElementById('emp-form-fn').value.trim(),
      last_name: document.getElementById('emp-form-ln').value.trim(),
      email: document.getElementById('emp-form-email').value.trim(),
      phone: document.getElementById('emp-form-phone').value.trim(),
      gender: document.getElementById('emp-form-gender').value,
      department_id: document.getElementById('emp-form-dept').value || null,
      designation: document.getElementById('emp-form-desig').value.trim(),
      joining_date: document.getElementById('emp-form-date').value,
      basic_salary: parseFloat(document.getElementById('emp-form-basic').value) || 0,
      hra: parseFloat(document.getElementById('emp-form-hra').value) || 0,
      da: parseFloat(document.getElementById('emp-form-da').value) || 0,
      allowances: parseFloat(document.getElementById('emp-form-allow').value) || 0,
      deductions: parseFloat(document.getElementById('emp-form-ded').value) || 0,
      status: document.getElementById('emp-form-status').value,
      address: document.getElementById('emp-form-addr').value.trim(),
      userRole: App.currentRoleName
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.designation) {
      return App.showToast('Complete all required employee fields.', 'warning');
    }
    if (payload.basic_salary <= 0) {
      return App.showToast('Basic salary must be greater than zero.', 'warning');
    }

    try {
      let res;
      if (id) {
        res = await API.updateEmployee(id, payload);
      } else {
        res = await API.createEmployee(payload);
      }

      if (res.success) {
        App.showToast(res.message, 'success');
        const modalEl = document.getElementById('modal-employee-form');
        bootstrap.Modal.getInstance(modalEl).hide();
        await Employees.loadEmployees();
        // Refresh dashboard stats if visible
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to save employee:', err);
      App.showToast(err.message || 'Employee could not be saved.', 'danger');
    }
  },

  deleteEmployee: async (id, name) => {
    if (!confirm(`Are you sure you want to delete employee '${name}'?\nThis will also remove their attendance, leave, and payroll records.`)) {
      return;
    }

    try {
      const res = await API.deleteEmployee(id, App.currentRoleName);
      if (res.success) {
        App.showToast(res.message, 'success');
        await Employees.loadEmployees();
        Dashboard.loadStats();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to delete employee:', err);
      App.showToast(err.message || 'Employee could not be deleted.', 'danger');
    }
  }
};
