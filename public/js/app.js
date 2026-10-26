// Main Application Controller
const App = {
  currentRole: 'admin', // 'admin' | 'hr_manager' | 'employee'
  currentRoleName: 'Admin',
  currentEmployeeId: 1, // Default employee for employee self-service view
  currentView: 'dashboard',
  demoEmployees: [],

  escapeHtml: (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;'),

  getLocalISODate: (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  emptyRow: (colspan, title, message = 'Try adjusting the filters or add a new record.') => `
    <tr>
      <td colspan="${colspan}" class="p-0">
        <div class="empty-state">
          <div>
            <i class="bi bi-inbox" aria-hidden="true"></i>
            <strong>${App.escapeHtml(title)}</strong>
            <span>${App.escapeHtml(message)}</span>
          </div>
        </div>
      </td>
    </tr>
  `,

  init: async () => {
    // Connect existing visual labels to their controls for screen readers.
    document.querySelectorAll('.form-label').forEach((label) => {
      const control = label.parentElement?.querySelector('input, select, textarea');
      if (control?.id && !label.htmlFor) label.htmlFor = control.id;
    });

    // Setup live clock
    App.startClock();

    // Load demo users
    await App.loadDemoUsers();

    // Event listeners for forms
    document.getElementById('form-employee')?.addEventListener('submit', Employees.saveEmployee);
    document.getElementById('form-department')?.addEventListener('submit', Departments.saveDepartment);
    document.getElementById('form-attendance')?.addEventListener('submit', Attendance.saveAttendanceForm);
    document.getElementById('form-apply-leave')?.addEventListener('submit', Leaves.submitLeaveApplication);
    document.getElementById('form-generate-payroll')?.addEventListener('submit', Payroll.submitGeneratePayroll);

    // Initial navigation
    App.applyRolePermissions();
    App.navigateTo('dashboard');
  },

  startClock: () => {
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const el = document.getElementById('topbar-clock');
      if (el) el.innerText = `${dateStr} • ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  loadDemoUsers: async () => {
    try {
      const res = await API.getDemoUsers();
      if (res.success) {
        App.demoEmployees = res.employees;

        // Populate employee dropdown in demo switcher
        const sel = document.getElementById('demo-select-employee');
        if (sel) {
          sel.innerHTML = res.employees.map(e => `
            <option value="${e.id}">${e.employee_code} - ${e.first_name} ${e.last_name} (${e.designation})</option>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load demo users:', err);
      App.showToast(err.message || 'Demo profiles could not be loaded.', 'danger');
    }
  },

  openRoleSwitcher: () => {
    const modalEl = document.getElementById('modal-role-switcher');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  },

  selectRoleOption: (role) => {
    const empSelectDiv = document.getElementById('demo-employee-picker-container');
    if (role === 'employee') {
      empSelectDiv?.classList.remove('d-none');
    } else {
      empSelectDiv?.classList.add('d-none');
    }
  },

  applySelectedRole: () => {
    const selectedRadio = document.querySelector('input[name="demoRole"]:checked');
    if (!selectedRadio) return;

    App.currentRole = selectedRadio.value;
    if (App.currentRole === 'admin') {
      App.currentRoleName = 'Admin';
    } else if (App.currentRole === 'hr_manager') {
      App.currentRoleName = 'HR Manager';
    } else {
      App.currentRoleName = 'Employee';
      const selEmp = document.getElementById('demo-select-employee');
      if (selEmp) App.currentEmployeeId = parseInt(selEmp.value, 10) || 1;
    }

    App.applyRolePermissions();

    const modalEl = document.getElementById('modal-role-switcher');
    bootstrap.Modal.getInstance(modalEl).hide();

    // Redirect view depending on role
    if (App.currentRole === 'employee') {
      App.navigateTo('selfservice');
      App.showToast(`Switched to Employee Self-Service mode!`, 'info');
    } else {
      App.navigateTo('dashboard');
      App.showToast(`Switched to ${App.currentRoleName} view!`, 'info');
    }
  },

  applyRolePermissions: () => {
    const roleBadge = document.getElementById('current-role-badge');
    const userNameEl = document.getElementById('current-user-name');

    if (roleBadge) {
      roleBadge.className = 'role-badge-pill';
      if (App.currentRole === 'admin') {
        roleBadge.classList.add('role-admin');
        roleBadge.innerHTML = '<i class="bi bi-shield-lock-fill"></i> System Admin (Full Access)';
        if (userNameEl) userNameEl.innerText = 'Admin User';
      } else if (App.currentRole === 'hr_manager') {
        roleBadge.classList.add('role-hr');
        roleBadge.innerHTML = '<i class="bi bi-person-badge-fill"></i> HR Manager (Anita Verma)';
        if (userNameEl) userNameEl.innerText = 'Anita Verma (HR Director)';
      } else {
        const emp = App.demoEmployees.find(e => e.id === App.currentEmployeeId);
        const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee User';
        roleBadge.classList.add('role-employee');
        roleBadge.innerHTML = `<i class="bi bi-person-fill"></i> Employee: ${name}`;
        if (userNameEl) userNameEl.innerText = name;
      }
    }

    // Toggle sidebar navigation items based on role
    const adminHrLinks = document.querySelectorAll('.nav-admin-hr');
    const employeeLinks = document.querySelectorAll('.nav-employee-only');

    if (App.currentRole === 'employee') {
      adminHrLinks.forEach(el => el.classList.add('d-none'));
      employeeLinks.forEach(el => el.classList.remove('d-none'));
    } else {
      adminHrLinks.forEach(el => el.classList.remove('d-none'));
      employeeLinks.forEach(el => el.classList.remove('d-none')); // Admins can also inspect self-service
    }
  },

  navigateTo: async (viewName) => {
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (!targetPanel) {
      App.showToast('That workspace is not available.', 'warning');
      return;
    }

    App.currentView = viewName;

    // Update active class on sidebar
    document.querySelectorAll('.nav-link-custom').forEach(link => {
      link.classList.remove('active');
    });
    document.getElementById(`nav-${viewName}`)?.classList.add('active');

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.add('d-none');
    });

    // Show target view panel
    targetPanel.classList.remove('d-none');
    targetPanel.classList.add('is-loading');
    targetPanel.setAttribute('aria-busy', 'true');

    if (window.innerWidth < 992) {
      document.getElementById('sidebar')?.classList.remove('show');
    }

    // Call view initializer
    try {
      if (viewName === 'dashboard') {
        await Dashboard.init();
      } else if (viewName === 'employees') {
        await Employees.init();
      } else if (viewName === 'departments') {
        await Departments.init();
      } else if (viewName === 'attendance') {
        await Attendance.init();
      } else if (viewName === 'leaves') {
        await Leaves.init();
      } else if (viewName === 'payroll') {
        await Payroll.init();
      } else if (viewName === 'reports') {
        await Reports.init();
      } else if (viewName === 'selfservice') {
        await SelfService.init();
      }
    } catch (err) {
      console.error(`Failed to load ${viewName}:`, err);
      App.showToast(err.message || 'The workspace could not be loaded.', 'danger');
    } finally {
      targetPanel.classList.remove('is-loading');
      targetPanel.removeAttribute('aria-busy');
    }
  },

  showToast: (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const safeMessage = App.escapeHtml(message);
    let bgClass = 'bg-primary text-white';
    let icon = 'bi-info-circle-fill';
    if (type === 'success') bgClass = 'bg-success text-white';
    else if (type === 'danger') {
      bgClass = 'bg-danger text-white';
      icon = 'bi-exclamation-octagon-fill';
    }
    else if (type === 'warning') bgClass = 'bg-warning text-dark';
    else if (type === 'info') bgClass = 'bg-info text-dark';
    if (type === 'success') icon = 'bi-check-circle-fill';
    if (type === 'warning') icon = 'bi-exclamation-triangle-fill';

    const toastId = 'toast-' + Date.now();
    const html = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi ${icon}"></i>
            <div>${safeMessage}</div>
          </div>
          <button type="button" class="btn-close ${type !== 'warning' && type !== 'info' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled request error:', event.reason);
  App.showToast(event.reason?.message || 'Something went wrong. Please try again.', 'danger');
});
