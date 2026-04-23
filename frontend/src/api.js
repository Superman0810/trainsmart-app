const BASE = 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  generatePlan: (data) => request('/plans/generate', { method: 'POST', body: JSON.stringify(data) }),
  getPlan: (planId) => request(`/plans/${planId}`),
  logSession: (sessionId, data) => request(`/sessions/${sessionId}/log`, { method: 'POST', body: JSON.stringify(data) }),
  adaptPlan: (data) => request('/plans/adapt', { method: 'POST', body: JSON.stringify(data) }),
  exportExcel: (planId) => `${BASE}/export/${planId}/excel`,
  exportPdf: (planId) => `${BASE}/export/${planId}/pdf`,
}
