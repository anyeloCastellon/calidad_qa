import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { companyPath, request } from './api.js'
import { ConfirmModal, Empty, ErrorNotice, FormModal, Loading, PageHeading, dateLabel, useResource } from './ui.jsx'
import { ContractStatus, contractFields } from './Clients.jsx'

const acceptedExtensions = ['pdf', 'doc', 'ppt', 'jpg', 'jpeg', 'png']

export function ContractDetail({ companyId, client, contractId, admin, notify, onBack, onClients }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const path = companyPath(companyId, `/contratos/${contractId}`)
  const resource = useResource(() => request(path), [path])
  const contract = resource.value?.data
  return <><nav className="breadcrumbs" aria-label="Ruta de navegación"><Button onClick={onClients}>Clientes</Button><span aria-hidden="true">/</span><Button onClick={onBack}>{client.nombre}</Button><span aria-hidden="true">/</span><span>{contract?.titulo || 'Contrato'}</span></nav>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : contract && <>
      <PageHeading eyebrow={`CONTRATO · ${client.nombre}`} title={contract.titulo} description={contract.descripcion} action={admin && <div className="record-actions"><Button variant="outlined" onClick={() => setEditing(true)}>Editar contrato</Button><Button color="error" onClick={() => setDeleting(true)}>Eliminar contrato</Button></div>}/>
      <section className="panel contract-dates"><div><span className="muted">Inicio</span><strong>{dateLabel(contract.fecha_inicio)}</strong></div><div><span className="muted">Término</span><strong>{dateLabel(contract.fecha_fin)}</strong></div><div><span className="muted">Estado</span><ContractStatus estado={contract.estado}/></div></section>
      <DocumentPanel path={path} companyId={companyId} admin={admin} notify={notify}/>
      {editing && <FormModal title="Editar contrato" fields={contractFields} initial={{ ...contract, fecha_inicio: contract.fecha_inicio?.slice(0, 10), fecha_fin: contract.fecha_fin?.slice(0, 10) }} onClose={() => setEditing(false)} onSubmit={async values => { await request(path, { method: 'PATCH', body: values }); resource.reload(); notify('Contrato actualizado.') }}/>}
      {deleting && <ConfirmModal title="Eliminar contrato" text="¿Desea eliminar este contrato? Su documento y sus enlaces dejarán de estar disponibles." label="Eliminar contrato" onClose={() => setDeleting(false)} onConfirm={async () => { await request(path, { method: 'DELETE', body: { confirmacion: true } }); notify('Contrato eliminado.'); onBack() }}/>}
    </>}
  </>
}

function useFileActions(notify) {
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview?.url])
  async function open(path, document, download) {
    setBusy(true); setError(null)
    try {
      const blob = await request(path, { blob: true })
      const url = URL.createObjectURL(blob)
      if (download) {
        const anchor = window.document.createElement('a')
        anchor.href = url; anchor.download = document.original_name; window.document.body.append(anchor); anchor.click(); anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 3000)
        notify('Descarga iniciada.')
      } else setPreview({ url, document })
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  return { preview, setPreview, busy, error, open }
}

function Preview({ preview, onClose }) {
  const mime = preview.document.mime_type
  const supported = mime === 'application/pdf' || mime?.startsWith('image/')
  return <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="preview-title"><DialogTitle id="preview-title">{preview.document.original_name}</DialogTitle><DialogContent className="preview-content">
    {mime?.startsWith('image/') ? <img className="document-image" src={preview.url} alt={preview.document.original_name}/> : mime === 'application/pdf' ? <iframe title={`Vista previa de ${preview.document.original_name}`} src={preview.url}/> : <Alert severity="info">Este formato no tiene vista previa en el navegador. Puede descargarlo y abrirlo con una aplicación compatible.</Alert>}
    {!supported && <Button component="a" href={preview.url} download={preview.document.original_name} variant="contained">Descargar documento</Button>}
  </DialogContent><DialogActions><Button onClick={onClose}>Cerrar vista previa</Button></DialogActions></Dialog>
}

function DocumentPanel({ path, companyId, admin, notify }) {
  const resource = useResource(async () => {
    const [document, links] = await Promise.all([request(`${path}/documento`), request(`${path}/enlaces`)])
    return { document: document.data, links: links.data }
  }, [path])
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [revoking, setRevoking] = useState(null)
  const files = useFileActions(notify)
  const document = resource.value?.document
  function chooseFile(event) {
    const selected = event.target.files?.[0]
    setError(null); setFile(null)
    if (!selected) return
    const ext = selected.name.split('.').pop().toLowerCase()
    if (!acceptedExtensions.includes(ext)) { setError(new Error('Seleccione un archivo PDF, DOC, PPT, JPG o PNG.')); event.target.value = ''; return }
    if (selected.size > 10 * 1024 * 1024) { setError(new Error('El archivo supera el máximo de 10 MiB.')); event.target.value = ''; return }
    if (selected.size === 0) { setError(new Error('Seleccione un archivo que tenga contenido.')); event.target.value = ''; return }
    setFile(selected)
  }
  async function upload(event) {
    event.preventDefault()
    if (!file) return setError(new Error('Seleccione un archivo antes de adjuntarlo.'))
    setBusy(true); setError(null)
    try {
      const body = new FormData(); body.append('archivo', file)
      await request(`${path}/documento`, { method: 'POST', body }); setFile(null); resource.reload(); notify('Documento adjuntado.')
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  async function createLink() {
    setBusy(true); setError(null)
    try { await request(`${path}/enlaces`, { method: 'POST', body: { horas: 24 } }); resource.reload(); notify('Enlace creado. Caduca en 24 horas.') } catch (err) { setError(err) } finally { setBusy(false) }
  }
  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); notify('Enlace copiado.') } catch { notify('Puede seleccionar y copiar el enlace desde el campo de texto.', 'info') }
  }
  return <><section className="panel"><div className="section-heading"><Typography component="h2" variant="h5">Documento del contrato</Typography><span className="muted">Un archivo por contrato</span></div><ErrorNotice error={resource.error || error || files.error}/>
    {resource.loading ? <Loading/> : document ? <div className="document-card"><div><strong>{document.original_name}</strong><p className="muted">{((document.byte_size || 0) / 1024).toLocaleString('es-CL', { maximumFractionDigits: 1 })} KiB · {document.extension?.toUpperCase()}</p></div><div className="record-actions"><Button variant="outlined" disabled={files.busy} onClick={() => files.open(`${path}/documento/contenido`, document, false)}>Vista previa</Button><Button variant="contained" disabled={files.busy} onClick={() => files.open(`${path}/documento/contenido`, document, true)}>Descargar</Button>{admin && <Button color="error" onClick={() => setDeleting(true)}>Quitar documento</Button>}</div></div> : admin ? <form className="upload-form" onSubmit={upload}><p>Adjunte un documento para mantenerlo junto a este contrato.</p><label htmlFor="contract-file">Seleccionar documento</label><input id="contract-file" type="file" accept=".pdf,.doc,.ppt,.jpg,.jpeg,.png" onChange={chooseFile} disabled={busy}/><p className="muted">PDF, DOC, PPT, JPG o PNG. Máximo 10 MiB.</p>{file && <p>Archivo seleccionado: <strong>{file.name}</strong></p>}<Button type="submit" variant="contained" disabled={busy || !file}>{busy ? 'Adjuntando…' : 'Adjuntar documento'}</Button></form> : <Empty title="Sin documento adjunto">Todavía no hay un documento disponible para este contrato.</Empty>}
  </section>
  {document && <section className="panel"><div className="section-heading"><div><Typography component="h2" variant="h5">Compartir documento</Typography><p className="muted">Los enlaces requieren iniciar sesión y pertenecer a esta empresa.</p></div>{admin && <Button variant="outlined" disabled={busy} onClick={createLink}>Crear enlace de 24 horas</Button>}</div>
    {resource.value?.links?.length ? <div className="links-list">{resource.value.links.map(link => {
      const active = !link.revoked_at && new Date(link.expires_at) > new Date()
      return <article key={link.id} className="share-link"><p>{link.revoked_at ? 'Revocado' : active ? 'Disponible' : 'Caducado'} · Vence: {dateLabel(link.expires_at)}</p><TextField fullWidth label="Enlace para compartir" value={link.url || ''} slotProps={{ input: { readOnly: true } }} onFocus={event => event.target.select()}/><div className="record-actions"><Button disabled={!active} onClick={() => copyLink(link.url)}>Copiar enlace</Button>{admin && <Button disabled={!active} color="error" onClick={() => setRevoking(link)}>Revocar enlace</Button>}</div></article>
    })}</div> : <p className="muted">No hay enlaces creados para este documento.</p>}
  </section>}
  {deleting && <ConfirmModal title="Quitar documento" text="¿Desea quitar el documento de este contrato? Sus enlaces dejarán de permitir el acceso." label="Quitar documento" onClose={() => setDeleting(false)} onConfirm={async () => { await request(`${path}/documento`, { method: 'DELETE', body: { confirmacion: true } }); resource.reload(); notify('Documento retirado.') }}/>}
  {revoking && <ConfirmModal title="Revocar enlace" text="Quienes tengan este enlace ya no podrán utilizarlo para abrir el documento." label="Revocar enlace" onClose={() => setRevoking(null)} onConfirm={async () => { await request(companyPath(companyId, `/enlaces/${revoking.id}`), { method: 'DELETE' }); resource.reload(); notify('Enlace revocado.') }}/>}
  {files.preview && <Preview preview={files.preview} onClose={() => files.setPreview(null)}/>}
  </>
}

export function SharedDocument({ token, onCompany, notify }) {
  const path = `/compartidos/${encodeURIComponent(token)}`
  const resource = useResource(() => request(path), [path])
  const data = resource.value?.data
  const files = useFileActions(notify)
  useEffect(() => { if (data?.empresa_id) onCompany(data.empresa_id) }, [data?.empresa_id])
  return <><PageHeading eyebrow="ACCESO COMPARTIDO" title="Documento compartido" description="Este documento está disponible para los miembros autorizados de la empresa."/><ErrorNotice error={resource.error || files.error}/>{resource.loading ? <Loading/> : data && <section className="panel"><Typography component="h2" variant="h5">{data.documento.original_name}</Typography><p className="muted">Para conservar una copia, descargue el documento.</p><div className="record-actions"><Button variant="outlined" disabled={files.busy} onClick={() => files.open(`${path}/contenido`, data.documento, false)}>Vista previa</Button><Button variant="contained" disabled={files.busy} onClick={() => files.open(`${path}/contenido`, data.documento, true)}>Descargar</Button></div></section>}{files.preview && <Preview preview={files.preview} onClose={() => files.setPreview(null)}/>}</>
}
