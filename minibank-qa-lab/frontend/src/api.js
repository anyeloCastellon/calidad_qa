export async function llamar(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const res = await fetch(`/api${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  } catch {
    return { res: { ok: false, status: 0 }, data: {} }
  }
}

export const pesos = (n) => '$' + Number(n).toLocaleString('es-CL')
