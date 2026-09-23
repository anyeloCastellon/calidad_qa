import { useState } from 'react'
import { llamar } from './api.js'

export default function Login({ onLogin }) {
  const [rut, setRut] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  async function ingresar(e) {
    e.preventDefault()
    setError('')
    const { res, data } = await llamar('/login', { metodo: 'POST', cuerpo: { rut, clave } })
    if (!res.ok) {
      setError(data.mensaje || 'No fue posible iniciar sesión')
      return
    }
    console.log('Sesión iniciada', data)
    onLogin(data.token)
  }

  return (
    <form className="tarjeta" onSubmit={ingresar}>
      <h2>Ingresar</h2>
      <label>
        RUT
        <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="11.111.111-1" />
      </label>
      <label>
        Clave
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
      </label>
      <button type="submit">Ingresar</button>
      {error && <p className="aviso error">❌ {error}</p>}
    </form>
  )
}
