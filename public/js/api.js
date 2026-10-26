// Small, shared API client for the local Express backend.
const API = (() => {
  const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    const serialized = query.toString();
    return serialized ? `?${serialized}` : '';
  };

  const request = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { success: false, message: 'The server returned an unexpected response.' };

      if (!response.ok) {
        const error = new Error(data.message || `Request failed (${response.status}).`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The request timed out. Check that the local server is running.');
      }
      if (error instanceof TypeError) {
        throw new Error('Cannot reach the local HRMS server. Run npm start and try again.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const jsonRequest = (url, method, data) => request(url, {
    method,
    body: JSON.stringify(data)
  });

  return {
    getDemoUsers: () => request('/api/auth/demo-users'),

    getStats: () => request('/api/dashboard/stats'),
    getCharts: () => request('/api/dashboard/charts'),
    getRecentActivities: () => request('/api/dashboard/recent-activities'),

    getEmployees: (params = {}) => request(`/api/employees${buildQuery(params)}`),
    getEmployee: (id) => request(`/api/employees/${encodeURIComponent(id)}`),
    createEmployee: (data) => jsonRequest('/api/employees', 'POST', data),
    updateEmployee: (id, data) => jsonRequest(`/api/employees/${encodeURIComponent(id)}`, 'PUT', data),
    deleteEmployee: (id, userRole) => jsonRequest(`/api/employees/${encodeURIComponent(id)}`, 'DELETE', { userRole }),

    getDepartments: () => request('/api/departments'),
    createDepartment: (data) => jsonRequest('/api/departments', 'POST', data),
    updateDepartment: (id, data) => jsonRequest(`/api/departments/${encodeURIComponent(id)}`, 'PUT', data),
    deleteDepartment: (id, userRole) => jsonRequest(`/api/departments/${encodeURIComponent(id)}`, 'DELETE', { userRole }),

    getTodayAttendance: (date) => request(`/api/attendance/today${buildQuery({ date })}`),
    getAttendanceHistory: (params = {}) => request(`/api/attendance/history${buildQuery(params)}`),
    getEmployeeAttendance: (id) => request(`/api/attendance/employee/${encodeURIComponent(id)}`),
    markAttendance: (data) => jsonRequest('/api/attendance/mark', 'POST', data),

    getLeaves: (params = {}) => request(`/api/leaves${buildQuery(params)}`),
    getEmployeeLeaves: (id) => request(`/api/leaves/employee/${encodeURIComponent(id)}`),
    applyLeave: (data) => jsonRequest('/api/leaves/apply', 'POST', data),
    updateLeaveStatus: (id, data) => jsonRequest(`/api/leaves/${encodeURIComponent(id)}/status`, 'PUT', data),

    getPayroll: (params = {}) => request(`/api/payroll${buildQuery(params)}`),
    getPayrollSummary: (monthYear) => request(`/api/payroll/summary${buildQuery({ month_year: monthYear })}`),
    generatePayroll: (data) => jsonRequest('/api/payroll/generate', 'POST', data),
    getPayslip: (id) => request(`/api/payroll/${encodeURIComponent(id)}/payslip`),
    getEmployeePayroll: (id) => request(`/api/payroll/employee/${encodeURIComponent(id)}`),
    updatePayrollStatus: (id, status, userRole) => jsonRequest(`/api/payroll/${encodeURIComponent(id)}/status`, 'PUT', { status, userRole }),

    getEmployeeReport: (params = {}) => request(`/api/reports/employees${buildQuery(params)}`),
    getAttendanceReport: (params = {}) => request(`/api/reports/attendance${buildQuery(params)}`),
    getLeaveReport: (params = {}) => request(`/api/reports/leaves${buildQuery(params)}`),
    getPayrollReport: (params = {}) => request(`/api/reports/payroll${buildQuery(params)}`)
  };
})();
