import axios from 'axios'

let accessToken = null
let refreshPromise = null
let sessionListener = () => {}

export class ApiError extends Error {
  constructor(payload, status) {
    super(payload.error?.message || 'No fue posible completar la solicitud.')
    this.status = status
    this.code = payload.error?.code
    this.fields = payload.error?.fields || {}
    this.requestId = payload.requestId
  }
}

export function observeSession(listener) {
  sessionListener = listener
  return () => { sessionListener = () => {} }
}

export function acceptSession(data) {
  accessToken = data.access_token
  sessionListener(data)
}

export function clearSession() {
  accessToken = null
  sessionListener(null)
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true, validateStatus: () => true })
        const payload = response.data || {}
        if (response.status !== 200) throw new ApiError(payload, response.status)
        acceptSession(payload.data)
        return payload.data
      } catch (error) {
        clearSession()
        throw error
      } finally { refreshPromise = null }
    })()
  }
  return refreshPromise
}

export async function request(path, { method = 'GET', body, auth = true, blob = false, retry = true } = {}) {
  const headers = {}
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`
  let response
  try {
    response = await axios.request({ url: `/api${path}`, method, headers, withCredentials: true,
      data: body, responseType: blob ? 'blob' : 'json', validateStatus: () => true })
  } catch {
    throw new Error('No hay conexión con Cuidarte+. Revise la conexión y vuelva a intentarlo.')
  }
  if (response.status === 401 && auth && retry) {
    await refreshSession()
    return request(path, { method, body, auth, blob, retry: false })
  }
  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401 && auth) clearSession()
    let payload = response.data || {}
    if (payload instanceof Blob) { try { payload = JSON.parse(await payload.text()) } catch { payload = {} } }
    throw new ApiError(payload, response.status)
  }
  if (blob) return response.data
  return response.status === 204 ? { data: null } : response.data
}


export async function login(values) {
  const result = await request('/auth/login', { method: 'POST', body: values, auth: false })
  acceptSession(result.data)
  return result.data
}

export async function logout() {
  await request('/auth/logout', { method: 'POST', body: {} })
  clearSession()
}
