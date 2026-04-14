const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async register(name: string, email: string, password: string, year: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, year }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  // Students
  async getStudents() {
    const res = await fetch(`${API_BASE}/students`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  },

  // Events
  async getEvents() {
    const res = await fetch(`${API_BASE}/events`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async createEvent(event: { name: string; description: string; participationPoints: number; winningPoints: number; category: string }) {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  // Student Events (participation)
  async getStudentEvents(studentId?: string) {
    const url = studentId
      ? `${API_BASE}/student-events?studentId=${studentId}`
      : `${API_BASE}/student-events`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch student events');
    return res.json();
  },

  async participate(eventId: string) {
    const res = await fetch(`${API_BASE}/student-events`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Participation failed');
    }
    return res.json();
  },

  // Submissions
  async submitProof(eventId: string, claimType: string, file: File) {
    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('claimType', claimType);
    formData.append('proofFile', file);

    const token = getToken();
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Submission failed');
    return res.json();
  },

  async getSubmissions(status?: string) {
    const url = status
      ? `${API_BASE}/submissions?status=${status}`
      : `${API_BASE}/submissions`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch submissions');
    return res.json();
  },

  async approveSubmission(submissionId: string) {
    const res = await fetch(`${API_BASE}/submissions/${submissionId}/approve`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  async rejectSubmission(submissionId: string) {
    const res = await fetch(`${API_BASE}/submissions/${submissionId}/reject`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Rejection failed');
    return res.json();
  },

  // Utility
  getProofFileUrl(filename: string) {
    return `${API_BASE}/uploads/${filename}`;
  },

  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  },

  clearToken() {
    localStorage.removeItem('auth_token');
  },
};
