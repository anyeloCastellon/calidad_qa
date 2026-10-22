import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { request } from './api.js'
import { ConfirmModal, Empty, ErrorNotice, FormModal, Loading, dateLabel, useResource } from './ui.jsx'

const fields = [
  { name: 'nombre', label: 'Nombre del examen', required: true, maxLength: 200 },
  { name: 'tipo', label: 'Tipo de examen', required: true, default: 'laboratorio', options: [{ value: 'laboratorio', label: 'Laboratorio' }, { value: 'imagenologia', label: 'Imagenología' }, { value: 'otro', label: 'Otro' }] },
  { name: 'fecha', label: 'Fecha del examen', type: 'date', required: true },
  { name: 'descripcion', label: 'Descripción', multiline: true, maxLength: 4000 },
  { name: 'observaciones', label: 'Observaciones', multiline: true, maxLength: 4000 },
]
export default function Exams({ patientId, canEdit, onNotice }) {
  const resource = useResource(() => request(`/pacientes/${patientId}/examenes`), [patientId])
  const [create, setCreate] = useState(false), [selected, setSelected] = useState(null)
  const refresh = () => { resource.reload(); onNotice('Cambios guardados') }
  return <section aria-label="Exámenes"><div className="section-heading"><Typography component="h2" variant="h5">Exámenes</Typography>{canEdit && <Button variant="contained" onClick={() => setCreate(true)}>Registrar examen</Button>}</div>
    <ErrorNotice error={resource.error}/>{resource.loading ? <Loading/> : resource.value && <div className="record-list">{resource.value.data.map(exam => <article className="record-row" key={exam.id}><div className="record-main"><Typography component="h3" variant="h5">{exam.nombre}</Typography><p className="muted">{dateLabel(exam.fecha)} · {exam.tipo === 'imagenologia' ? 'Imagenología' : exam.tipo}</p><span>{exam.documento ? exam.documento.original_name : 'Sin documento adjunto'}</span></div><Button variant="outlined" onClick={() => setSelected(exam.id)}>Ver examen</Button></article>)}{!resource.value.data.length && <Empty title="Sin exámenes">No hay exámenes registrados.</Empty>}</div>}
    {create && <FormModal title="Registrar examen" fields={fields} onClose={() => setCreate(false)} onSubmit={async values => { await request(`/pacientes/${patientId}/examenes`, { method: 'POST', body: values }); refresh() }}/ >}
    {selected && <ExamDetail examId={selected} canEdit={canEdit} onClose={() => { setSelected(null); resource.reload() }} onChange={refresh} onNotice={onNotice}/ >}
  </section>
}

function ExamDetail({ examId, canEdit, onClose, onChange, onNotice }) {
  const resource = useResource(() => request(`/examenes/${examId}`), [examId])
  const [edit, setEdit] = useState(false), [remove, setRemove] = useState(null), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(null), [preview, setPreview] = useState(null)
  const fileInput = useRef(null), exam = resource.value?.data, doc = exam?.documento
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])
  async function upload(event) {
    event.preventDefault(); if (!file) return
    setBusy(true); setError(null)
    try {
      const data = new FormData(); data.append('archivo', file)
      await request(`/examenes/${examId}/documento`, { method: doc ? 'PUT' : 'POST', body: data })
      setFile(null); if (fileInput.current) fileInput.current.value = ''; resource.reload(); onChange()
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  async function download(view = false) {
    setError(null); setBusy(true)
    try {
      const data = await request(`/examenes/${examId}/documento/contenido`, { blob: true }), url = URL.createObjectURL(data)
      if (view) setPreview({ url, mime: doc.mime_type, name: doc.original_name })
      else { const anchor = document.createElement('a'); anchor.href = url; anchor.download = doc.original_name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000) }
    } catch (err) { setError(err) } finally { setBusy(false) }
  }
  return <><Dialog open fullWidth maxWidth="md" onClose={busy ? undefined : onClose} aria-labelledby="exam-title"><DialogTitle id="exam-title">{exam?.nombre || 'Examen'}</DialogTitle><DialogContent>
    <ErrorNotice error={resource.error || error}/>{resource.loading ? <Loading/> : exam && <><dl className="detail-grid">{[['Fecha', dateLabel(exam.fecha)], ['Tipo', exam.tipo === 'imagenologia' ? 'Imagenología' : exam.tipo], ['Descripción', exam.descripcion], ['Observaciones', exam.observaciones]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Sin registrar'}</dd></div>)}</dl>
      <section className="panel" aria-label="Documento del examen"><Typography component="h2" variant="h5">Documento</Typography>{doc ? <div className="document-card"><div><p>{doc.original_name}</p><p className="muted">{(doc.byte_size / 1024).toFixed(1)} KiB · {dateLabel(doc.created_at)}</p></div><div className="record-actions">{(doc.mime_type === 'application/pdf' || doc.mime_type.startsWith('image/')) && <Button disabled={busy} onClick={() => download(true)}>Vista previa</Button>}<Button variant="outlined" disabled={busy} onClick={() => download()}>Descargar</Button>{canEdit && <Button color="error" disabled={busy} onClick={() => setRemove('documento')}>Eliminar documento</Button>}</div></div> : <p className="muted">Sin documento adjunto.</p>}
        {canEdit && <form className="upload-form" onSubmit={upload}><label htmlFor="exam-document">{doc ? 'Reemplazar documento' : 'Adjuntar documento'}</label><input id="exam-document" ref={fileInput} type="file" accept=".pdf,.doc,.ppt,.jpg,.jpeg,.png" disabled={busy} onChange={e => setFile(e.target.files[0] || null)}/><p className="muted">PDF, DOC, PPT, JPG o PNG. Máximo 10 MiB. Un documento por examen.</p><Button type="submit" variant="contained" disabled={!file || busy}>{busy ? 'Procesando…' : doc ? 'Reemplazar archivo' : 'Adjuntar archivo'}</Button></form>}
      </section></>}
  </DialogContent><DialogActions>{canEdit && exam && <><Button disabled={busy} onClick={() => setEdit(true)}>Editar examen</Button><Button color="error" disabled={busy} onClick={() => setRemove('examen')}>Eliminar examen</Button></>}<Button disabled={busy} onClick={onClose}>Cerrar</Button></DialogActions></Dialog>
    {edit && <FormModal title="Editar examen" fields={fields} initial={exam} onClose={() => setEdit(false)} onSubmit={async values => { await request(`/examenes/${examId}`, { method: 'PATCH', body: values }); resource.reload(); onChange() }}/ >}
    {remove && <ConfirmModal title={remove === 'examen' ? 'Eliminar examen' : 'Eliminar documento'} text={remove === 'examen' ? '¿Confirma que desea eliminar este examen?' : '¿Confirma que desea eliminar el documento adjunto?'} label="Eliminar" onClose={() => setRemove(null)} onConfirm={async () => { await request(`/examenes/${examId}${remove === 'documento' ? '/documento' : ''}`, { method: 'DELETE', body: { confirmacion: true } }); if (remove === 'examen') { onNotice('Examen eliminado'); onClose() } else { resource.reload(); onNotice('Documento eliminado') } onChange() }}/ >}
    {preview && <Dialog open fullWidth maxWidth="md" onClose={() => setPreview(null)} aria-labelledby="preview-title"><DialogTitle id="preview-title">{preview.name}</DialogTitle><DialogContent className="preview-content">{preview.mime === 'application/pdf' ? <iframe title="Vista previa del documento" src={preview.url}/> : <img className="document-image" alt={preview.name} src={preview.url}/>}</DialogContent><DialogActions><Button onClick={() => setPreview(null)}>Cerrar vista previa</Button></DialogActions></Dialog>}
  </>
}
