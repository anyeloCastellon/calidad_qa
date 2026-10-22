import { useEffect, useState } from 'react'
import { Alert, Avatar, Button, Chip, MenuItem, Snackbar, TextField, Typography } from '@mui/material'
import Auth, { authRoute } from './Auth.jsx'
import { companyPath, logout, observeSession, refreshSession, request } from './api.js'
import { Empty, ErrorNotice, FormModal, Loading, PageHeading, useResource } from './ui.jsx'
import Clients from './Clients.jsx'
import Team, { Audit } from './Team.jsx'
import { SharedDocument } from './Documents.jsx'

const companyFields = [
  { name: 'nombre', label: 'Nombre de la empresa', required: true },
  { name: 'direccion', label: 'Dirección', required: true },
  { name: 'telefono', label: 'Teléfono', required: true, type: 'tel' },
  { name: 'email', label: 'Correo de la empresa', required: true, type: 'email' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [section, setSection] = useState('Resumen')
  const [emailRoute, setEmailRoute] = useState(authRoute)
  const [sharedToken, setSharedToken] = useState(() => window.location.pathname.startsWith('/compartidos/') ? window.location.pathname.split('/')[2] : null)
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [notice, setNotice] = useState(null)
  useEffect(() => {
    const stop = observeSession(setSession)
    refreshSession().catch(() => {}).finally(() => setBooting(false))
    return stop
  }, [])
  useEffect(() => {
    if (session && !session.empresas?.some(company => company.id === companyId)) setCompanyId(session.empresas?.[0]?.id || '')
    if (!session) { setCompanyId(''); setSection('Resumen') }
  }, [session, companyId])
  const companies = session?.empresas || []
  const company = companies.find(item => item.id === companyId)
  const admin = company?.rol === 'administrador'
  const notify = (message, severity = 'success') => setNotice({ message, severity })
  async function refreshMemberships() {
    const result = await request('/auth/me')
    setSession(old => ({ ...old, ...result.data }))
  }
  function go(sectionName) {
    setSection(sectionName); setSharedToken(null)
    window.history.replaceState({}, '', '/')
  }
  function selectCompany(id) { setCompanyId(id); go('Resumen') }
  function continueFromEmail() { if (!sharedToken) window.history.replaceState({}, '', '/'); setEmailRoute(null) }
  async function leave() { try { await logout(); notify('Sesión cerrada.') } catch (error) { notify(error.message, 'error') } }
  if (booting) return <div className="boot"><div className="wordmark"><span className="brand-mark">A</span>Atlas</div><Loading/></div>
  if (emailRoute || !session) return <Auth route={emailRoute} session={session} onContinue={continueFromEmail} shared={!!sharedToken}/>
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Ir al contenido</a>
    <aside className="sidebar"><div className="wordmark"><span className="brand-mark">A</span>Atlas</div><p className="sidebar-caption">Espacio de trabajo</p>
      {companies.length > 0 && <TextField select fullWidth label="Empresa activa" value={companyId} onChange={event => selectCompany(event.target.value)} className="company-selector">{companies.map(item => <MenuItem key={item.id} value={item.id}>{item.nombre}</MenuItem>)}</TextField>}
      <nav aria-label="Navegación principal" className="main-nav">{['Resumen', 'Clientes', 'Usuarios', 'Auditoría'].map((name, index) => <Button key={name} fullWidth className={section === name && !sharedToken ? 'nav-active' : ''} aria-current={section === name && !sharedToken ? 'page' : undefined} onClick={() => go(name)}><span className="nav-symbol" aria-hidden="true">{['◫', '▤', '♧', '≡'][index]}</span>{name}</Button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><Avatar sx={{ bgcolor: '#d9e9e5', color: '#173f3c' }}>{session.user.nombre_usuario.slice(0, 1).toUpperCase()}</Avatar><div><strong>{session.user.nombre_usuario}</strong><span>{company?.rol === 'editor' ? 'Editor · Solo lectura' : company ? 'Administrador' : 'Mi cuenta'}</span></div></div><Button onClick={leave} variant="outlined" fullWidth>Cerrar sesión</Button></div>
    </aside>
    <main id="main-content" className="main-content" tabIndex={-1}>
      <header className="workspace-header"><span>{company?.nombre || 'Su espacio Atlas'}</span><Button onClick={() => setCreatingCompany(true)}>Crear empresa</Button></header>
      {company?.rol === 'editor' && <Alert className="role-notice" severity="info">Tiene acceso de lectura a esta empresa. Puede consultar y descargar información.</Alert>}
      {sharedToken ? <SharedDocument token={sharedToken} onCompany={id => setCompanyId(id)} notify={notify}/> : !company ? <><PageHeading eyebrow="EMPEZAR" title="Un espacio para su empresa" description="Cree una empresa para organizar sus clientes y trabajar con su equipo."/><Empty title="Todavía no tiene empresas"><Button variant="contained" onClick={() => setCreatingCompany(true)}>Crear mi primera empresa</Button></Empty></> : <div key={`${company.id}-${section}`}>
        {section === 'Resumen' && <Dashboard companyId={company.id} onClients={() => go('Clientes')}/>}
        {section === 'Clientes' && <Clients companyId={company.id} admin={admin} notify={notify}/>}
        {section === 'Usuarios' && <Team companyId={company.id} admin={admin} notify={notify} refreshMemberships={refreshMemberships}/>}
        {section === 'Auditoría' && <Audit companyId={company.id}/>}
      </div>}
    </main>
    {creatingCompany && <FormModal title="Crear empresa" fields={companyFields} onClose={() => setCreatingCompany(false)} submitLabel="Crear empresa" onSubmit={async values => {
      const result = await request('/empresas', { method: 'POST', body: values }); await refreshMemberships(); setCompanyId(result.data.id); go('Resumen'); notify('Empresa creada. Ya puede agregar clientes y miembros.')
    }}/>}
    <Snackbar open={!!notice} autoHideDuration={6500} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>{notice ? <Alert onClose={() => setNotice(null)} severity={notice.severity} variant="filled">{notice.message}</Alert> : undefined}</Snackbar>
  </div>
}

function Dashboard({ companyId, onClients }) {
  const resource = useResource(() => request(companyPath(companyId, '/dashboard')), [companyId])
  const data = resource.value?.data
  return <><PageHeading eyebrow="SU EMPRESA, EN UN VISTAZO" title="Resumen" description="La información esencial para empezar el día." action={<Button variant="contained" onClick={onClients}>Ver clientes</Button>}/>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : data && <>
      <div className="metrics">{[['Clientes', data.clientes], ['Contratos', data.contratos], ['Documentos', data.documentos], ['Usuarios', data.usuarios]].map(([label, count]) => <div className="metric" key={label}><span>{label}</span><strong>{count ?? 0}</strong><small>En esta empresa</small></div>)}</div>
      <section className="panel"><div className="section-heading"><Typography component="h2" variant="h5">Estado de los contratos</Typography><Chip label="Actualizado al consultar" variant="outlined"/></div><div className="status-summary">{[['activo', 'Activos'], ['vence', 'Vencen pronto'], ['expirado', 'Expirados'], ['programado', 'Programados']].map(([key, label]) => <div key={key}><span className={`status-dot ${key}`}/><span>{label}</span><strong>{data.estados?.[key] || 0}</strong></div>)}</div></section>
    </>}
  </>
}
