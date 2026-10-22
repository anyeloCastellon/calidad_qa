import { useEffect, useState } from 'react'
import { Alert, Avatar, Button, Snackbar, Typography } from '@mui/material'
import { observeSession, refreshSession, logout, request } from './api.js'
import Auth, { Brand } from './Auth.jsx'
import Patients, { PatientDetail } from './Patients.jsx'
import { Audit, Users } from './Team.jsx'
import { ErrorNotice, Loading, PageHeading, useResource } from './ui.jsx'

const roleLabels = { administrador: 'Administrador', medico: 'Médico', paciente: 'Paciente' }
function Dashboard({ user, onOpen }) {
  const resource = useResource(() => request('/dashboard'), [])
  return <><PageHeading title={`Hola, ${user.nombre_usuario}`} /><ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : resource.value && <><div className="metrics">{[['pacientes', 'Pacientes'], ['examenes', 'Exámenes'], ['documentos', 'Documentos']].filter(([key]) => user.rol !== 'paciente' || key !== 'pacientes').map(([key, label]) => <article key={key} className="metric"><span>{label}</span><strong>{resource.value.data[key]}</strong></article>)}</div><section className="panel"><Typography component="h2" variant="h5">{user.rol === 'paciente' ? 'Mi información' : 'Atención de pacientes'}</Typography><p className="muted">{user.rol === 'paciente' ? 'Ficha personal y exámenes registrados.' : 'Fichas, exámenes y documentos clínicos.'}</p><Button variant="contained" onClick={onOpen}>{user.rol === 'paciente' ? 'Abrir mi ficha' : 'Ver pacientes'}</Button></section></>}</>
}
export default function App() {
  const [session, setSession] = useState(null), [boot, setBoot] = useState(true), [view, setView] = useState('resumen'), [patient, setPatient] = useState(null), [notice, setNotice] = useState(''), [error, setError] = useState(null), [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const stop = observeSession(data => { setSession(data); if (!data) { setView('resumen'); setPatient(null) } })
    if (location.pathname === '/confirmar') setBoot(false)
    else refreshSession().catch(() => {}).finally(() => setBoot(false))
    return stop
  }, [])
  if (boot) return <div className="boot"><Brand/><Loading/></div>
  if (!session) return <Auth/>
  const user = session.user, isPatient = user.rol === 'paciente'
  const nav = [['resumen', 'Resumen', '⌂'], [isPatient ? 'ficha' : 'pacientes', isPatient ? 'Mi ficha' : 'Pacientes', '+'], ...(user.rol === 'administrador' ? [['usuarios', 'Usuarios', '○'], ['auditoria', 'Auditoría', '≡']] : [])]
  function navigate(value) { setView(value); setPatient(null); setError(null); document.getElementById('contenido')?.focus(); window.scrollTo({ top: 0 }) }
  async function signOut() { setLeaving(true); setError(null); try { await logout() } catch (err) { setError(err) } finally { setLeaving(false) } }
  return <><a className="skip-link" href="#contenido">Ir al contenido</a><div className="app-shell"><aside className="sidebar"><Brand/><p className="sidebar-caption">Gestión de salud</p><nav className="main-nav" aria-label="Navegación principal">{nav.map(([key, label, icon]) => <Button key={key} className={view === key ? 'nav-active' : ''} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span className="nav-symbol" aria-hidden="true">{icon}</span>{label}</Button>)}</nav><div className="sidebar-bottom"><div className="profile"><Avatar sx={{ bgcolor: '#e7effb', color: '#193351' }}>{user.nombre_usuario[0].toUpperCase()}</Avatar><div><strong>{user.nombre_usuario}</strong><span>{roleLabels[user.rol]}</span></div></div><Button variant="outlined" disabled={leaving} onClick={signOut}>{leaving ? 'Cerrando…' : 'Cerrar sesión'}</Button></div></aside>
    <main className="main-content" id="contenido" tabIndex="-1"><header className="workspace-header"><span>Cuidarte+ · {roleLabels[user.rol]}</span><span>{new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(new Date())}</span></header><ErrorNotice error={error}/>
      {view === 'resumen' && <Dashboard user={user} onOpen={() => navigate(isPatient ? 'ficha' : 'pacientes')}/ >}
      {view === 'pacientes' && !isPatient && <Patients user={user} selected={patient} onSelect={setPatient} onNotice={setNotice}/ >}
      {view === 'ficha' && isPatient && (session.paciente_id ? <PatientDetail patientId={session.paciente_id} user={user} onNotice={setNotice}/> : <Alert severity="info">No hay una ficha asociada a esta cuenta.</Alert>)}
      {view === 'usuarios' && user.rol === 'administrador' && <Users onNotice={setNotice}/ >}
      {view === 'auditoria' && user.rol === 'administrador' && <Audit/ >}
    </main></div><Snackbar open={!!notice} autoHideDuration={4500} onClose={() => setNotice('')}><Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert></Snackbar></>
}
