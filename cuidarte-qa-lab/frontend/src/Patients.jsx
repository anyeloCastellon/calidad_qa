import { useState } from 'react'
import { Button, Chip, TextField, Typography } from '@mui/material'
import { request } from './api.js'
import { ConfirmModal, Empty, ErrorNotice, FormModal, Loading, PageHeading, Pagination, dateLabel, useResource } from './ui.jsx'
import Exams from './Exams.jsx'

const patientFields = [
  { name: 'nombre', label: 'Nombre completo', required: true, maxLength: 160 },
  { name: 'rut', label: 'RUT', maxLength: 15 }, { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
  { name: 'sexo', label: 'Sexo', options: [{ value: '', label: 'Sin registrar' }, { value: 'femenino', label: 'Femenino' }, { value: 'masculino', label: 'Masculino' }, { value: 'otro', label: 'Otro' }, { value: 'no_informa', label: 'No informa' }] },
  { name: 'email', label: 'Correo electrónico', type: 'email' }, { name: 'telefono', label: 'Teléfono', maxLength: 30 },
  { name: 'direccion', label: 'Dirección', maxLength: 300 }, { name: 'antecedentes', label: 'Antecedentes', multiline: true, maxLength: 4000 },
]
const accountFields = [{ name: 'usuario_acceso', label: 'Usuario de acceso (opcional)', maxLength: 32 }, { name: 'clave_acceso', label: 'Contraseña de acceso', type: 'password', help: '12 caracteres como mínimo; mayúscula, minúscula, número y símbolo.', autoComplete: 'new-password' }]
function createPayload(values) {
  const { usuario_acceso, clave_acceso, ...data } = values
  if (usuario_acceso || clave_acceso) data.cuenta = { nombre_usuario: usuario_acceso, password: clave_acceso }
  return data
}

export default function Patients({ user, selected, onSelect, onNotice }) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [create, setCreate] = useState(false)
  const resource = useResource(() => request(`/pacientes?page=${page}&q=${encodeURIComponent(query)}`), [page, query])
  if (selected) return <PatientDetail key={selected} patientId={selected} user={user} onBack={() => { onSelect(null); resource.reload() }} onNotice={onNotice}/>
  return <><PageHeading title="Pacientes" action={<Button variant="contained" onClick={() => setCreate(true)}>Registrar paciente</Button>}/>
    <form className="filters" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search) }}><TextField label="Buscar por nombre o RUT" value={search} onChange={e => setSearch(e.target.value)}/><Button type="submit" variant="outlined">Buscar</Button></form>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : resource.value && <><div className="record-list">{resource.value.data.map(patient => <article className="record-row" key={patient.id}><div className="record-main"><Typography component="h2" variant="h5">{patient.nombre}</Typography><p className="muted">{patient.rut || 'Sin RUT registrado'}</p><span>{patient.email || 'Sin correo registrado'}</span></div><Button variant="outlined" onClick={() => onSelect(patient.id)}>Abrir ficha</Button></article>)}</div>{!resource.value.data.length && <Empty title="No hay pacientes">No se encontraron registros.</Empty>}<Pagination meta={resource.value.meta} page={page} onChange={setPage}/></>}
    {create && <FormModal title="Registrar paciente" fields={[...patientFields, ...accountFields]} onClose={() => setCreate(false)} onSubmit={async values => { await request('/pacientes', { method: 'POST', body: createPayload(values) }); resource.reload(); onNotice('Paciente registrado') }}/>}</>
}

export function PatientDetail({ patientId, user, onBack, onNotice }) {
  const resource = useResource(() => request(`/pacientes/${patientId}`), [patientId])
  const [edit, setEdit] = useState(false), [remove, setRemove] = useState(false)
  const patient = resource.value?.data, canEdit = user.rol !== 'paciente'
  return <>{onBack && <div className="breadcrumbs"><Button onClick={onBack}>Volver a pacientes</Button></div>}<ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : patient && <>
    <PageHeading title={canEdit ? patient.nombre : 'Mi ficha'} action={canEdit && <div className="record-actions"><Button variant="outlined" onClick={() => setEdit(true)}>Editar paciente</Button>{user.rol === 'administrador' && <Button color="error" onClick={() => setRemove(true)}>Eliminar paciente</Button>}</div>}/>
    <section className="panel" aria-label="Datos del paciente"><div className="section-heading"><Typography component="h2" variant="h5">Datos del paciente</Typography><Chip label={patient.usuario_id ? 'Con acceso' : 'Sin cuenta de acceso'} size="small"/></div><dl className="detail-grid whitespace-pre-wrap">{[
      ['Nombre', patient.nombre], ['RUT', patient.rut], ['Fecha de nacimiento', patient.fecha_nacimiento && dateLabel(patient.fecha_nacimiento)], ['Sexo', patient.sexo?.replace('_', ' ')], ['Correo electrónico', patient.email], ['Teléfono', patient.telefono], ['Dirección', patient.direccion], ['Antecedentes', patient.antecedentes],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Sin registrar'}</dd></div>)}</dl></section>
    <Exams patientId={patientId} canEdit={canEdit} onNotice={onNotice}/>
    {edit && <FormModal title="Editar paciente" fields={patientFields} initial={patient} onClose={() => setEdit(false)} onSubmit={async values => { await request(`/pacientes/${patientId}`, { method: 'PATCH', body: values }); resource.reload(); onNotice('Paciente actualizado') }}/ >}
    {remove && <ConfirmModal title="Eliminar paciente" text={`¿Confirma que desea eliminar a ${patient.nombre}?`} label="Eliminar" onClose={() => setRemove(false)} onConfirm={async () => { await request(`/pacientes/${patientId}`, { method: 'DELETE', body: { confirmacion: true } }); onNotice('Paciente eliminado'); onBack() }}/ >}
  </>}</>
}
