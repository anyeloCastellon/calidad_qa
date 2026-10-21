import { useState } from 'react'
import { Button, Chip, TextField, Typography } from '@mui/material'
import { companyPath, request } from './api.js'
import { ConfirmModal, Empty, ErrorNotice, FormModal, Loading, PageHeading, Pagination, useResource } from './ui.jsx'

const roleOptions = [{ value: 'administrador', label: 'Administrador' }, { value: 'editor', label: 'Editor · Solo lectura' }]
const roleField = { name: 'rol', label: 'Rol en esta empresa', options: roleOptions, default: 'editor', required: true }

export default function Team({ companyId, admin, notify, refreshMemberships }) {
  const resource = useResource(() => request(companyPath(companyId, '/usuarios')), [companyId])
  const [form, setForm] = useState(null)
  const [removing, setRemoving] = useState(null)
  const users = resource.value?.data || []
  const createFields = [{ name: 'nombre_usuario', label: 'Nombre de usuario', required: true }, { name: 'email', label: 'Correo electrónico', type: 'email', required: true }, { name: 'password', label: 'Contraseña inicial', type: 'password', minLength: 12, required: true, help: 'Al menos 12 caracteres, mayúscula, minúscula, número y símbolo.' }, roleField]
  const fields = form?.kind === 'invite' ? [{ name: 'email', label: 'Correo electrónico', type: 'email', required: true }, roleField] : form?.kind === 'edit' ? [roleField, { name: 'activo', label: 'Acceso a esta empresa', options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Desactivado' }], default: 'true' }] : createFields
  return <><PageHeading eyebrow="PERSONAS Y PERMISOS" title="Usuarios" description="Las personas que forman parte de su empresa y sus niveles de acceso." action={admin && <div className="record-actions"><Button variant="outlined" onClick={() => setForm({ kind: 'invite' })}>Invitar persona</Button><Button variant="contained" onClick={() => setForm({ kind: 'create' })}>Crear usuario</Button></div>}/>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : users.length ? <div className="record-list">{users.map(user => <article className="record-row" key={user.id}><div className="record-main"><Typography component="h2" variant="h5">{user.nombre_usuario}</Typography><p>{user.email}</p><div className="record-actions"><Chip label={user.rol === 'administrador' ? 'Administrador' : 'Editor · Solo lectura'} variant="outlined"/>{!user.activo && <Chip label="Acceso desactivado" color="default"/>}{!user.confirmed_at && <Chip label="Correo pendiente de confirmar" color="warning" variant="outlined"/>}</div></div>{admin && <div className="record-actions"><Button variant="outlined" onClick={() => setForm({ kind: 'edit', user })}>Cambiar acceso</Button><Button color="error" onClick={() => setRemoving(user)}>Desvincular</Button></div>}</article>)}</div> : <Empty title="Sin usuarios para mostrar">La lista de miembros aparecerá aquí.</Empty>}
    {form && <FormModal title={form.kind === 'invite' ? 'Invitar persona' : form.kind === 'edit' ? `Cambiar acceso de ${form.user.nombre_usuario}` : 'Crear usuario'} fields={fields} initial={form.user ? { ...form.user, activo: String(form.user.activo) } : {}} submitLabel={form.kind === 'invite' ? 'Enviar invitación' : 'Guardar'} onClose={() => setForm(null)} onSubmit={async values => {
      const path = companyPath(companyId, form.kind === 'invite' ? '/invitaciones' : `/usuarios${form.user ? `/${form.user.id}` : ''}`)
      const body = form.kind === 'edit' ? { rol: values.rol, activo: values.activo === 'true' } : values
      const result = await request(path, { method: form.kind === 'edit' ? 'PATCH' : 'POST', body })
      resource.reload(); if (form.kind === 'edit') await refreshMemberships()
      notify(form.kind === 'invite' ? result.data.mensaje || 'Invitación enviada por correo.' : form.kind === 'create' ? 'Usuario creado. Debe confirmar su correo antes de ingresar.' : 'Acceso actualizado.')
    }}/>}
    {removing && <ConfirmModal title="Desvincular usuario" text={`¿Desea quitar el acceso de ${removing.nombre_usuario} a esta empresa? Su cuenta y sus otras empresas se conservarán.`} label="Desvincular" onClose={() => setRemoving(null)} onConfirm={async () => { await request(companyPath(companyId, `/usuarios/${removing.id}`), { method: 'DELETE', body: { confirmacion: true } }); resource.reload(); await refreshMemberships(); notify('Usuario desvinculado de la empresa.') }}/>}
  </>
}

export function Audit({ companyId }) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ accion: '', recurso: '' })
  const [applied, setApplied] = useState({ accion: '', recurso: '' })
  const query = new URLSearchParams({ ...applied, page, limit: 10, page_size: 10 })
  const resource = useResource(() => request(companyPath(companyId, `/auditoria?${query}`)), [companyId, page, applied.accion, applied.recurso])
  const rows = resource.value?.data || []
  function actorLabel(actor) { return actor && typeof actor === 'object' ? actor.nombre_usuario || actor.email || 'Usuario' : actor || 'Sistema' }
  function timestamp(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(date) }
  return <><PageHeading eyebrow="HISTORIAL DE LA EMPRESA" title="Auditoría" description="Consulte las acciones realizadas por las personas de su empresa."/>
    <form className="filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); setPage(1) }}><TextField label="Filtrar por acción" value={filters.accion} onChange={event => setFilters(old => ({ ...old, accion: event.target.value }))}/><TextField label="Filtrar por recurso" value={filters.recurso} onChange={event => setFilters(old => ({ ...old, recurso: event.target.value }))}/><Button type="submit" variant="outlined">Filtrar</Button><Button onClick={() => { setFilters({ accion: '', recurso: '' }); setApplied({ accion: '', recurso: '' }); setPage(1) }}>Limpiar</Button></form>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : rows.length ? <div className="record-list">{rows.map(row => <article className="audit-row" key={row.id}><div><strong>{row.accion}</strong><p>{row.recurso}</p></div><div><strong>{actorLabel(row.actor)}</strong><p className="muted">{timestamp(row.created_at)}</p></div>{row.detalle && <details><summary>Ver detalle</summary><pre>{typeof row.detalle === 'string' ? row.detalle : JSON.stringify(row.detalle, null, 2)}</pre></details>}</article>)}</div> : <Empty title="No hay actividad para mostrar">Las acciones de la empresa aparecerán en este registro.</Empty>}
    <Pagination meta={resource.value?.meta} page={page} onChange={setPage}/>
  </>
}
