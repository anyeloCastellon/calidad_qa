import { useState } from 'react'
import { llamar } from './api.js'

export default function Login({ onLogin, onUnauthorized }) {
  const [rut, setRut] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function ingresar(e) {
    e.preventDefault()
    setBusy(true)
    const { res, data } = await llamar('/login', { metodo: 'POST', cuerpo: { rut, clave } })
    setBusy(false)
    if (!res.ok) {
      if (res.status === 401) onUnauthorized()
      return setError(data.mensaje || 'No fue posible conectar con MiniBank. Revise la conexión.')
    }
    setError('')
    onLogin(data.token)
  }
  return <form className="tarjeta" onSubmit={ingresar}>
    <h2>Ingresar a su cuenta</h2>
    <label>RUT<input autoComplete="username" value={rut} onChange={e => setRut(e.target.value)} placeholder="11.111.111-1" /></label>
    <label>Clave<input autoComplete="current-password" type="password" value={clave} onChange={e => setClave(e.target.value)} /></label>
    <button disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
    {error && <p role="alert" className="aviso error">{error}</p>}
    <p className="nota">Laboratorio local · Build 3.0.0-sast-lab · RUT 11.111.111-1 · clave 1234</p>
  </form>
}
