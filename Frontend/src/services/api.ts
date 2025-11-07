import { SecureStorage } from '../utils/security';

const RAW_API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5001';
const API_BASE_URL = RAW_API_BASE.endsWith('/api') ? RAW_API_BASE : `${RAW_API_BASE}/api`;

// TODO: Add retry logic for failed requests
// FIXME: Error handling could be more specific

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    
    // Debug: Log API initialization
    console.log('API Service initialized with base URL:', this.baseURL);
  }

  public async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const token = SecureStorage.getItem('authToken');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Debug: Log outgoing requests
    console.log('API Request:', { url, method: config.method || 'GET' });

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Debug: Log API responses
      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        const err = Object.assign(new Error(data.message || 'Request failed'), {
          status: response.status,
          data,
        });
        throw err;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    // Debug: Log registration attempt
    console.log('Registering user:', { email: userData.email });
    
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    // Debug: Log logout
    console.log('Logging out user');
    
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // User profile endpoints
  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Payment endpoints
  async createPayment(paymentData: any) {
    // Debug: Log payment creation
    console.log('Creating payment:', { 
      amount: paymentData.amount, 
      currency: paymentData.currency,
      recipient: paymentData.recipientName 
    });
    
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPayments() {
    return this.request('/payments');
  }

  async getPaymentById(id: string) {
    return this.request(`/payments/${id}`);
  }

  // Employee endpoints
  async employeeGetAllPayments(page: number = 1, limit: number = 20, filters: Record<string, string | number | boolean> = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([k, v]) => params.set(k, String(v)));
    return this.request(`/employee/payments?${params.toString()}`);
  }

  async employeeGetGlobalStats() {
    return this.request('/employee/payments/stats');
  }

  async employeeCancelPayment(id: string, reason: string, reasonCode: string) {
    return this.request(`/employee/payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, reasonCode })
    });
  }

  async employeeValidatePayment(id: string) {
    return this.request(`/employee/payments/${id}/validate`, {
      method: 'PUT',
    });
  }

  async employeeRejectPayment(id: string, reason: string, reasonCode: string) {
    return this.request(`/employee/payments/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason, reasonCode })
    });
  }

  async employeeUpdateReason(id: string, reason: string, reasonCode?: string) {
    return this.request(`/employee/payments/${id}/reason`, {
      method: 'PUT',
      body: JSON.stringify({ reason, reasonCode })
    });
  }

  async employeeDeletePayment(id: string) {
    return this.request(`/employee/payments/${id}`, {
      method: 'DELETE',
      headers: { 'x-action-confirm': 'true' }
    });
  }

  async employeeRestorePayment(id: string) {
    return this.request(`/employee/payments/${id}/restore`, { method: 'PUT' });
  }

  async employeeBulkAction(action: 'reject' | 'cancel' | 'trash' | 'restore', ids: string[], reason?: string, reasonCode?: string) {
    return this.request(`/employee/payments/bulk`, {
      method: 'POST',
      headers: { 'x-action-confirm': 'true' },
      body: JSON.stringify({ action, ids, reason, reasonCode })
    });
  }

  async employeeAddNote(id: string, text: string, mentions: Array<{ userId: string; name?: string }> = []) {
    return this.request(`/employee/payments/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text, mentions })
    });
  }

  async employeeGetAudit(id: string) {
    return this.request(`/employee/payments/${id}/audit`);
  }

  async employeeAssignPayment(id: string, assigneeUserId?: string, assigneeName?: string) {
    return this.request(`/employee/payments/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assigneeUserId, assigneeName })
    });
  }

  async employeeEscalatePayment(id: string, escalated: boolean, notes?: string) {
    return this.request(`/employee/payments/${id}/escalate`, {
      method: 'PUT',
      body: JSON.stringify({ escalated, notes })
    });
  }

  async employeeGetTrends() {
    return this.request('/employee/payments/trends');
  }

  async employeeGetQueueHealth() {
    return this.request('/employee/payments/queue-health');
  }

  async employeeExportPayments(params: Record<string, string | number | boolean> = {}) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => usp.append(k, String(v)));
    const url = `${this.baseURL}/employee/payments/export?${usp.toString()}`;
    const token = SecureStorage.getItem('authToken');
    const resp = await fetch(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
    const blob = await resp.blob();
    if (!resp.ok) throw new Error('Export failed');
    return blob;
  }

  async getReasonCodes() {
    return this.request('/employee/reasons');
  }

  // Validation endpoints
  async validateIBAN(iban: string) {
    // Debug: Log IBAN validation
    console.log('Validating IBAN:', iban.substring(0, 4) + '****');
    
    return this.request('/validate/iban', {
      method: 'POST',
      body: JSON.stringify({ iban }),
    });
  }

  async validateSWIFT(swift: string) {
    // Debug: Log SWIFT validation
    console.log('Validating SWIFT code:', swift);
    
    return this.request('/validate/swift', {
      method: 'POST',
      body: JSON.stringify({ swift }),
    });
  }

  // Experimental: Batch operations (not implemented yet)
  /*
  async batchCreatePayments(payments: any[]) {
    return this.request('/payments/batch', {
      method: 'POST',
      body: JSON.stringify({ payments }),
    });
  }
  */
}

export const apiService = new ApiService();