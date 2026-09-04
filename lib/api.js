import { createClient } from './supabase/client';

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  me: () => request('/me'),

  getStores: () => request('/stores'),
  createStore: (payload) => request('/stores', { method: 'POST', body: JSON.stringify(payload) }),
  updateStore: (id, payload) => request(`/stores/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  importStores: (rows) => request('/stores/import', { method: 'POST', body: JSON.stringify({ rows }) }),

  getTemplates: () => request('/templates'),
  createTemplate: (payload) => request('/templates', { method: 'POST', body: JSON.stringify(payload) }),
  importTemplate: (payload) => request('/templates/import', { method: 'POST', body: JSON.stringify(payload) }),
  getTemplate: (id) => request(`/templates/${id}`),
  updateTemplate: (id, payload) => request(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  addSection: (templateId, payload) => request(`/templates/${templateId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id, payload) => request(`/sections/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSection: (id) => request(`/sections/${id}`, { method: 'DELETE' }),
  addQuestion: (sectionId, payload) => request(`/sections/${sectionId}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (id, payload) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),

  getAudits: (status) => request(`/audits${status ? `?status=${status}` : ''}`),
  createAudit: (payload) => request('/audits', { method: 'POST', body: JSON.stringify(payload) }),
  getAudit: (id) => request(`/audits/${id}`),
  updateAudit: (id, payload) => request(`/audits/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  discardAudit: (id) => request(`/audits/${id}`, { method: 'DELETE' }),
  updateAuditQuestion: (auditId, questionId, payload) =>
    request(`/audits/${auditId}/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getPhotoUploadUrl: (auditId, questionId, fileName) =>
    request(`/audits/${auditId}/questions/${questionId}/photo-url`, { method: 'POST', body: JSON.stringify({ fileName }) }),
  completeAudit: (id) => request(`/audits/${id}/complete`, { method: 'POST' }),
  sendReport: (id) => request(`/audits/${id}/send-report`, { method: 'POST' }),

  getTrendReport: (params) => request(`/reports/trend?${new URLSearchParams(params).toString()}`),
  getBreakdownReport: (params) => request(`/reports/breakdown?${new URLSearchParams(params).toString()}`),

  getDashboardSummary: (params) => request(`/dashboard?${new URLSearchParams(params).toString()}`),

  getUsers: () => request('/users'),

  getTasks: () => request('/tasks'),
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

// Uploads a compressed image straight to Supabase Storage using the signed
// URL/token issued by the photo-url endpoint.
export async function uploadToStorage(storagePath, token, file) {
  const supabase = createClient();
  const { error } = await supabase.storage.from('audit-photos').uploadToSignedUrl(storagePath, token, file);
  if (error) throw new Error(error.message);
}
