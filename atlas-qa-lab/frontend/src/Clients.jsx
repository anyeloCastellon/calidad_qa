import { useState } from 'react'
import { Button, Chip, TextField, Typography } from '@mui/material'
import { companyPath, request } from './api.js'
import { ConfirmModal, Empty, ErrorNotice, FormModal, Loading, PageHeading, Pagination, dateLabel, useResource } from './ui.jsx'
import { ContractDetail } from './Documents.jsx'

const clientFields = [
  { name: 'nombre', label: 'Nombre del cliente', required: true, maxLength: 160 },
  { name: 'empresa', label: 'Empresa del cliente', help: 'Razón social del cliente, si corresponde.' },
  { name: 'rut', label: 'RUT' }, { name: 'descripcion', label: 'Descripción', multiline: true },
  { name: 'direccion', label: 'Dirección' }, { name: 'email', label: 'Correo electrónico', type: 'email' }, { name: 'telefono', label: 'Teléfono', type: 'tel' },
  { name: 'banco', label: 'Banco' }, { name: 'tipo_cuenta', label: 'Tipo de cuenta' }, { name: 'numero_cuenta', label: 'Número de cuenta' },
]

export const contractFields = [
  { name: 'titulo', label: 'Título del contrato', required: true, maxLength: 180 },
  { name: 'descripcion', label: 'Descripción', multiline: true },
  { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
  { name: 'fecha_fin', label: 'Fecha de término', type: 'date', required: true },
]

function clientBody(values) {
  const { banco, tipo_cuenta, numero_cuenta, ...rest } = values
  return { ...rest, datos_bancarios: { banco, tipo_cuenta, numero_cuenta } }
}

export function ContractStatus({ estado }) {
  const labels = { activo: 'Activo', vence: 'Vence pronto', expirado: 'Expirado', programado: 'Programado' }
  return <Chip className={`contract-status ${estado}`} label={labels[estado] || estado} size="medium"/>
}

export default function Clients({ companyId, admin, notify }) {
  const [clientId, setClientId] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', empresa: '' })
  const [applied, setApplied] = useState({ nombre: '', empresa: '' })
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const query = new URLSearchParams({ ...applied, page, limit: 10 })
  const resource = useResource(() => request(companyPath(companyId, `/clientes?${query}`)), [companyId, applied.nombre, applied.empresa, page])
  const clients = resource.value?.data || []
  if (clientId) return <ClientDetail companyId={companyId} clientId={clientId} admin={admin} notify={notify} onBack={() => { setClientId(null); resource.reload() }}/>
  return <><PageHeading eyebrow="RELACIONES QUE IMPORTAN" title="Clientes" description="Busque un cliente para revisar su información y sus contratos." action={admin && <Button variant="contained" onClick={() => setEditor({})}>Nuevo cliente</Button>}/>
    <form className="filters" onSubmit={event => { event.preventDefault(); setPage(1); setApplied({ ...filters }) }}>
      <TextField label="Buscar por nombre" value={filters.nombre} onChange={event => setFilters(old => ({ ...old, nombre: event.target.value }))}/>
      <TextField label="Filtrar por empresa del cliente" value={filters.empresa} onChange={event => setFilters(old => ({ ...old, empresa: event.target.value }))}/>
      <Button type="submit" variant="outlined">Buscar</Button><Button onClick={() => { setFilters({ nombre: '', empresa: '' }); setApplied({ nombre: '', empresa: '' }); setPage(1) }}>Limpiar</Button>
    </form>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : clients.length ? <div className="record-list">{clients.map(client => <article className="record-row" key={client.id}><div className="record-main"><Typography component="h2" variant="h5">{client.nombre}</Typography><p>{client.empresa || 'Sin empresa indicada'}</p><span className="muted">{client.email || client.telefono || 'Sin contacto indicado'}</span></div><div className="record-actions"><Button variant="outlined" onClick={() => setClientId(client.id)}>Ver cliente</Button>{admin && <><Button onClick={() => setEditor(client)}>Editar</Button><Button color="error" onClick={() => setDeleting(client)}>Eliminar</Button></>}</div></article>)}</div> : <Empty title={applied.nombre || applied.empresa ? 'No encontramos coincidencias' : 'Su lista de clientes empieza aquí'}>{applied.nombre || applied.empresa ? 'Revise los filtros o limpie la búsqueda.' : admin ? 'Agregue su primer cliente para comenzar a organizar sus contratos.' : 'Todavía no hay clientes para consultar.'}</Empty>}
    <Pagination meta={resource.value?.meta} page={page} onChange={setPage}/>
    {editor && <FormModal title={editor.id ? 'Editar cliente' : 'Nuevo cliente'} fields={clientFields} initial={{ ...editor, ...editor.datos_bancarios }} onClose={() => setEditor(null)} onSubmit={async values => {
      await request(companyPath(companyId, `/clientes${editor.id ? `/${editor.id}` : ''}`), { method: editor.id ? 'PATCH' : 'POST', body: clientBody(values) }); resource.reload(); notify(editor.id ? 'Cliente actualizado.' : 'Cliente creado.')
    }}/>}
    {deleting && <ConfirmModal title="Eliminar cliente" text={`¿Desea eliminar a ${deleting.nombre}? Sus contratos y documentos dejarán de estar disponibles.`} label="Eliminar cliente" onClose={() => setDeleting(null)} onConfirm={async () => { await request(companyPath(companyId, `/clientes/${deleting.id}`), { method: 'DELETE', body: { confirmacion: true } }); resource.reload(); notify('Cliente eliminado.') }}/>}
  </>
}

function ClientDetail({ companyId, clientId, admin, notify, onBack }) {
  const [contractId, setContractId] = useState(null)
  const [creating, setCreating] = useState(false)
  const resource = useResource(async () => {
    const [client, contracts] = await Promise.all([request(companyPath(companyId, `/clientes/${clientId}`)), request(companyPath(companyId, `/clientes/${clientId}/contratos`))])
    return { client: client.data, contracts: contracts.data }
  }, [companyId, clientId])
  const client = resource.value?.client
  if (contractId && client) return <ContractDetail companyId={companyId} client={client} contractId={contractId} admin={admin} notify={notify} onBack={() => { setContractId(null); resource.reload() }} onClients={onBack}/>
  return <><nav className="breadcrumbs" aria-label="Ruta de navegación"><Button onClick={onBack}>Clientes</Button><span aria-hidden="true">/</span><span>{client?.nombre || 'Detalle'}</span></nav><ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : client && <>
    <PageHeading eyebrow="DETALLE DEL CLIENTE" title={client.nombre} description={client.empresa || 'Información del cliente'}/>
    <section className="panel"><Typography component="h2" variant="h5">Información de contacto</Typography><dl className="detail-grid">{[['RUT', client.rut], ['Correo electrónico', client.email], ['Teléfono', client.telefono], ['Dirección', client.direccion], ['Descripción', client.descripcion], ['Banco', client.datos_bancarios?.banco], ['Tipo de cuenta', client.datos_bancarios?.tipo_cuenta], ['Número de cuenta', client.datos_bancarios?.numero_cuenta]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value || '—'}</dd></div>)}</dl></section>
    <section><div className="section-heading"><div><Typography component="h2" variant="h5">Contratos</Typography><p className="muted">Acuerdos y documentos de este cliente.</p></div>{admin && <Button variant="contained" onClick={() => setCreating(true)}>Nuevo contrato</Button>}</div>
      {resource.value.contracts?.length ? <div className="record-list">{resource.value.contracts.map(contract => <article className="record-row" key={contract.id}><div className="record-main"><Typography component="h3" variant="h5">{contract.titulo}</Typography><p>{dateLabel(contract.fecha_inicio)} — {dateLabel(contract.fecha_fin)}</p><ContractStatus estado={contract.estado}/></div><Button variant="outlined" onClick={() => setContractId(contract.id)}>Ver contrato</Button></article>)}</div> : <Empty title="Sin contratos todavía">{admin ? 'Cree un contrato para guardar sus fechas y adjuntar un documento.' : 'Este cliente todavía no tiene contratos disponibles.'}</Empty>}
    </section>
    {creating && <FormModal title="Nuevo contrato" fields={contractFields} onClose={() => setCreating(false)} onSubmit={async values => { await request(companyPath(companyId, `/clientes/${clientId}/contratos`), { method: 'POST', body: values }); resource.reload(); notify('Contrato creado.') }}/>}
  </>}</>
}
