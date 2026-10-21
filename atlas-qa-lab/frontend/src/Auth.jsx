import { useEffect, useState } from 'react'
import { Alert, Button, Paper, TextField, Typography } from '@mui/material'
import { acceptSession, login, request } from './api.js'
import { ErrorNotice, Loading } from './ui.jsx'

export function authRoute() {
  const url = new URL(window.location.href)
  if (url.pathname === '/confirmar') return { kind: 'confirm', token: url.searchParams.get('token') || '' }
  if (url.pathname === '/invitacion') return { kind: 'invite', token: url.searchParams.get('token') || '' }
  return null
}

export default function Auth({ route, session, onContinue, shared }) {
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState({ nombre_usuario: session?.user?.nombre_usuario || '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const confirm = route?.kind === 'confirm'
  const invite = route?.kind === 'invite'
  useEffect(() => {
    if (!confirm) return
    if (!route.token) { setError(new Error('El enlace de confirmación está incompleto. Abra el enlace recibido por correo.')); return }
    let active = true
    setBusy(true)
    request('/auth/confirm', { method: 'POST', auth: false, body: { token: route.token } }).then(result => {
      if (active) { setMessage(result.data.mensaje || 'Correo confirmado. Ya puede ingresar.'); window.history.replaceState({}, '', '/confirmar') }
    }).catch(err => { if (active) setError(err) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [confirm, route?.token])
  function field(name) { return { value: values[name], onChange: event => setValues(old => ({ ...old, [name]: event.target.value })) } }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null); setMessage('')
    try {
      if (invite) {
        const result = await request('/auth/invitaciones/aceptar', { method: 'POST', auth: !!session, body: { token: route.token, nombre_usuario: values.nombre_usuario, password: values.password } })
        acceptSession(result.data); onContinue()
      } else if (mode === 'register') {
        const result = await request('/auth/register', { method: 'POST', auth: false, body: values })
        setMessage(result.data.mensaje || 'Revise su correo y confirme su cuenta antes de ingresar.'); setValues(old => ({ ...old, password: '' }))
      } else { await login({ nombre_usuario: values.nombre_usuario, password: values.password }); onContinue() }
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-intro"><div className="wordmark"><span className="brand-mark">A</span>Atlas</div><p className="eyebrow">Todo en su lugar</p><h1>Sus clientes.<br/>Sus acuerdos.<br/>Un espacio claro.</h1><p>Organice las relaciones de su empresa, encuentre sus contratos y comparta documentos con su equipo.</p><div className="auth-decoration" aria-hidden="true"><span/><span/><span/></div></div>
    <Paper className="auth-card" elevation={0}><Typography component="h2" variant="h4">{confirm ? 'Confirmar su correo' : invite ? 'Unirse a una empresa' : mode === 'register' ? 'Crear su cuenta' : 'Le damos la bienvenida'}</Typography>
      <p className="muted">{shared ? 'Ingrese para abrir el documento que compartieron con usted.' : invite ? 'Complete sus datos para aceptar la invitación. Si ya tiene cuenta, use sus credenciales actuales.' : confirm ? 'La confirmación protege el acceso a su cuenta.' : 'Ingrese con su nombre de usuario y contraseña.'}</p>
      <ErrorNotice error={error}/>{message && <Alert severity="success">{message}</Alert>}
      {confirm ? <>{busy && <Loading/>}<Button fullWidth variant="contained" onClick={onContinue}>Ir a ingresar</Button></> : <form className="form-stack" onSubmit={submit}>
        <TextField required label="Nombre de usuario" name="nombre_usuario" autoComplete="username" {...field('nombre_usuario')} fullWidth disabled={busy}/>
        {mode === 'register' && !invite && <TextField required label="Correo electrónico" name="email" type="email" autoComplete="email" {...field('email')} fullWidth disabled={busy}/>}
        <TextField required={!(invite && session)} label="Contraseña" name="password" type="password" autoComplete={mode === 'register' || invite ? 'new-password' : 'current-password'} {...field('password')} fullWidth disabled={busy} helperText={mode === 'register' || invite ? 'Al menos 12 caracteres, mayúscula, minúscula, número y símbolo.' : undefined}/>
        <Button type="submit" variant="contained" fullWidth disabled={busy}>{busy ? 'Procesando…' : invite ? 'Aceptar invitación' : mode === 'register' ? 'Registrarme' : 'Ingresar'}</Button>
      </form>}
      {!confirm && !invite && <Button fullWidth onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setMessage('') }}>{mode === 'login' ? '¿Primera vez? Crear una cuenta' : 'Ya tengo una cuenta'}</Button>}
      {invite && <Button fullWidth onClick={onContinue}>Volver al inicio</Button>}
      <p className="auth-footnote">Gestión de empresas, clientes y contratos.</p>
    </Paper>
  </div>
}
