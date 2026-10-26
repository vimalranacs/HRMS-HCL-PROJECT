// Departments Module
const Departments = {
  init: async () => {
    await Departments.loadDepartments();
  },

  loadDepartments: async () => {
    try {
      const res = await API.getDepartments();
      const container = document.getElementById('departments-cards-container');
      const tableBody = document.getElementById('departments-table-body');
      if (!container || !tableBody) return;

      if (!res.success || res.departments.length === 0) {
        container.innerHTML = '';
        tableBody.innerHTML = App.emptyRow(6, 'No departments yet', 'Create a department to organize employees.');
        return;
      }

      // Render cards
      container.innerHTML = res.departments.map(d => {
        return `
          <div class="col-md-4 mb-4">
            <div class="hrms-card h-100">
              <div class="hrms-card-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <span class="badge bg-primary px-2 py-1">${App.escapeHtml(d.code)}</span>
                  <div class="dropdown">
                    <button class="btn btn-sm btn-light border" data-bs-toggle="dropdown">
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li><a class="dropdown-item" href="#" onclick="Departments.openEditModal(${d.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                      <li><a class="dropdown-item text-danger" href="#" onclick="Departments.deleteDepartment(${d.id}, ${App.escapeHtml(JSON.stringify(d.name))})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                    </ul>
                  </div>
                </div>
                <h5 class="fw-bold text-dark mb-1">${App.escapeHtml(d.name)}</h5>
                <p class="text-muted small mb-3">${App.escapeHtml(d.description || 'No description provided.')}</p>
                <div class="p-2 rounded bg-light mb-3">
                  <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>Head of Dept:</span>
                    <span class="fw-semibold text-dark">${App.escapeHtml(d.head_name || 'Not Assigned')}</span>
                  </div>
                  <div class="d-flex justify-content-between small text-muted mb-1">
                    <span>Active Staff:</span>
                    <span class="fw-bold text-primary">${d.employee_count} Employees</span>
                  </div>
                  <div class="d-flex justify-content-between small text-muted">
                    <span>Monthly Payroll:</span>
                    <span class="fw-semibold text-dark">₹${(d.total_payroll_cost || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Render Table
      tableBody.innerHTML = res.departments.map(d => {
        return `
          <tr>
            <td><span class="badge bg-primary">${App.escapeHtml(d.code)}</span></td>
            <td class="fw-semibold text-dark">${App.escapeHtml(d.name)}</td>
            <td>${d.head_name ? App.escapeHtml(d.head_name) : '<span class="text-muted">Unassigned</span>'}</td>
            <td><span class="badge bg-light text-dark border px-2 py-1">${d.employee_count} Staff</span></td>
            <td>₹${(d.budget || 0).toLocaleString('en-IN')}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" onclick="Departments.openEditModal(${d.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="Departments.deleteDepartment(${d.id}, ${App.escapeHtml(JSON.stringify(d.name))})">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load departments:', err);
      App.showToast(err.message || 'Departments could not be loaded.', 'danger');
    }
  },

  openAddModal: () => {
    document.getElementById('dept-modal-title').innerText = 'Add New Department';
    document.getElementById('form-department').reset();
    document.getElementById('dept-form-id').value = '';
    const modalEl = document.getElementById('modal-department-form');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  },

  openEditModal: async (id) => {
    try {
      const res = await API.getDepartments();
      const dept = res.departments.find(d => d.id === id);
      if (!dept) return;

      document.getElementById('dept-modal-title').innerText = `Edit Department (${dept.name})`;
      document.getElementById('dept-form-id').value = dept.id;
      document.getElementById('dept-form-name').value = dept.name;
      document.getElementById('dept-form-code').value = dept.code;
      document.getElementById('dept-form-head').value = dept.head_name || '';
      document.getElementById('dept-form-budget').value = dept.budget || 0;
      document.getElementById('dept-form-desc').value = dept.description || '';

      const modalEl = document.getElementById('modal-department-form');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (err) {
      console.error('Failed to open dept edit modal:', err);
      App.showToast(err.message || 'Department details could not be loaded.', 'danger');
    }
  },

  saveDepartment: async (e) => {
    e.preventDefault();
    const id = document.getElementById('dept-form-id').value;

    const payload = {
      name: document.getElementById('dept-form-name').value.trim(),
      code: document.getElementById('dept-form-code').value.trim(),
      head_name: document.getElementById('dept-form-head').value.trim(),
      budget: parseFloat(document.getElementById('dept-form-budget').value) || 0,
      description: document.getElementById('dept-form-desc').value.trim(),
      userRole: App.currentRoleName
    };

    try {
      let res;
      if (id) {
        res = await API.updateDepartment(id, payload);
      } else {
        res = await API.createDepartment(payload);
      }

      if (res.success) {
        App.showToast(res.message, 'success');
        const modalEl = document.getElementById('modal-department-form');
        bootstrap.Modal.getInstance(modalEl).hide();
        await Departments.loadDepartments();
        // Update employee filters
        Employees.loadDepartmentOptions();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to save department:', err);
      App.showToast(err.message || 'Department could not be saved.', 'danger');
    }
  },

  deleteDepartment: async (id, name) => {
    if (!confirm(`Are you sure you want to delete the '${name}' department?\nEmployees assigned to this department will be unassigned.`)) {
      return;
    }

    try {
      const res = await API.deleteDepartment(id, App.currentRoleName);
      if (res.success) {
        App.showToast(res.message, 'success');
        await Departments.loadDepartments();
        Employees.loadDepartmentOptions();
      } else {
        App.showToast(res.message, 'danger');
      }
    } catch (err) {
      console.error('Failed to delete department:', err);
      App.showToast(err.message || 'Department could not be deleted.', 'danger');
    }
  }
};
