import { useEffect, useState } from 'react'
import { Alert, Button, Card, TextField, Typography } from '@mui/material'
import { login, request } from './api.js'
import { ErrorNotice } from './ui.jsx'

export function Brand() { return <div className="wordmark"><span className="brand-mark" aria-hidden="true">+</span>Cuidarte+</div> }
export default function Auth() {
  const [mode, setMode] = useState(location.pathname === '/confirmar' ? 'confirm' : 'login')
  const [values, setValues] = useState({ nombre_usuario: '', password: '', email: '' })
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [notice, setNotice] = useState('')
  useEffect(() => {
    if (mode !== 'confirm') return
    const token = new URLSearchParams(location.search).get('token') || ''
    setBusy(true)
    request('/auth/confirm', { method: 'POST', body: { token }, auth: false }).then(result => setNotice(result.data.mensaje)).catch(setError).finally(() => setBusy(false))
  }, [mode])
  function changeMode(next) { setError(null); setNotice(''); setMode(next); history.replaceState({}, '', '/'); setValues(old => ({ ...old, password: '' })) }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null); setNotice('')
    try {
      if (mode === 'login') await login({ nombre_usuario: values.nombre_usuario, password: values.password })
      else { const result = await request('/auth/register', { method: 'POST', body: values, auth: false }); setNotice(result.data.mensaje); setValues(old => ({ ...old, password: '' })) }
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-intro"><Brand/><h1>Tu información de salud,<br/>a tu alcance.</h1><p>Pacientes, exámenes y documentos en un solo lugar.</p><div className="auth-decoration" aria-hidden="true"><span/><span/><span/></div></div>
    <Card className="auth-card" elevation={0}><Typography component="h2" variant="h4">{mode === 'register' ? 'Crear cuenta' : mode === 'confirm' ? 'Confirmar correo' : 'Iniciar sesión'}</Typography>
      <ErrorNotice error={error}/>{notice && <Alert severity="success">{notice}</Alert>}
      {mode === 'confirm' ? <Button variant="contained" disabled={busy} onClick={() => changeMode('login')}>{busy ? 'Confirmando…' : 'Ir al inicio de sesión'}</Button> : <form className="form-stack" onSubmit={submit}>
        <TextField label="Nombre de usuario" required autoComplete={mode === 'login' ? 'username' : 'off'} value={values.nombre_usuario} onChange={e => setValues({ ...values, nombre_usuario: e.target.value })} inputProps={{ minLength: 3, maxLength: 32 }} error={!!error?.fields?.nombre_usuario} helperText={error?.fields?.nombre_usuario?.join('. ')}/>
        {mode === 'register' && <TextField label="Correo electrónico" type="email" required autoComplete="email" value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} error={!!error?.fields?.email} helperText={error?.fields?.email?.join('. ')}/>}
        <TextField label="Contraseña" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} error={!!error?.fields?.password} helperText={error?.fields?.password?.join('. ') || (mode === 'register' ? 'Al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.' : undefined)}/>
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Registrarse'}</Button>
        <Button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')} disabled={busy}>{mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}</Button>
      </form>}
    </Card></main>
}
