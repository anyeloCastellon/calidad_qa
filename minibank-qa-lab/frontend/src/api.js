export async function llamar(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

export const pesos = (n) => '$' + Number(n).toLocaleString('es-CL')
