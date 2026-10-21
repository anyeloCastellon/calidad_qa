import test from 'node:test'
import assert from 'node:assert/strict'
import https from 'node:https'
import fs from 'node:fs'

const base = process.env.ATLAS_BASE_URL || 'https://localhost:3443'
const ca = fs.readFileSync(process.env.PGSSLROOTCERT || '/certs/ca.crt')
function request(route, body) {
  return new Promise((resolve, reject) => {
    const bytes = body ? Buffer.from(JSON.stringify(body)) : undefined
    const req = https.request(new URL(route, base), { ca, method: body ? 'POST' : 'GET',
      headers: bytes ? { 'Content-Type': 'application/json', 'Content-Length': bytes.length } : {} }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }) } catch (error) { reject(error) } })
    })
    req.on('error', reject)
    if (bytes) req.write(bytes)
    req.end()
  })
}

test('Disponibilidad del servicio', async () => {
  const response = await request('/api/health')
  assert.equal(response.status, 200)
  assert.equal(response.data.data.build, '1.0.0')
})

test('Acceso con cuenta de práctica', async () => {
  const response = await request('/api/auth/login', { nombre_usuario: 'admin.atlas', password: 'AtlasDemo!2026' })
  assert.equal(response.status, 200)
  assert.equal(typeof response.data.data.access_token, 'string')
})
