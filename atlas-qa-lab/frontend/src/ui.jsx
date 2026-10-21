import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'

export function useResource(loader, dependencies = []) {
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(null)
    Promise.resolve().then(loader).then(result => { if (active) setValue(result) }).catch(err => { if (active) setError(err) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [...dependencies, revision])
  return { value, error, loading, reload: () => setRevision(n => n + 1) }
}

export function ErrorNotice({ error }) {
  return error ? <Alert severity="error" role="alert">{error.message || String(error)}{error.requestId && <div className="error-reference">Referencia: {error.requestId}</div>}</Alert> : null
}

export function Loading() { return <Box className="loading" role="status"><CircularProgress size={25}/><span>Cargando…</span></Box> }

export function Empty({ title, children }) { return <div className="empty"><Typography component="h2" variant="h5">{title}</Typography><p>{children}</p></div> }

export function FormModal({ title, fields, initial = {}, onClose, onSubmit, submitLabel = 'Guardar' }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.name, initial[field.name] ?? field.default ?? ''])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(null)
    try { await onSubmit(values); onClose() } catch (err) { setError(err) } finally { setBusy(false) }
  }
  return <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="form-title">
    <form onSubmit={submit}>
      <DialogTitle id="form-title">{title}</DialogTitle>
      <DialogContent className="dialog-fields"><ErrorNotice error={error}/>{fields.map(field => {
        const fieldError = error?.fields?.[field.name]
        return <TextField key={field.name} fullWidth label={field.label} name={field.name} value={values[field.name]} required={field.required} type={field.type || 'text'}
          multiline={field.multiline} minRows={field.multiline ? 3 : undefined} select={!!field.options} autoComplete={field.autoComplete || 'off'}
          onChange={event => setValues(old => ({ ...old, [field.name]: event.target.value }))} disabled={busy}
          error={!!fieldError} helperText={fieldError ? Array.isArray(fieldError) ? fieldError.join('. ') : String(fieldError) : field.help}
          slotProps={{ inputLabel: field.type === 'date' ? { shrink: true } : {}, htmlInput: { minLength: field.minLength, maxLength: field.maxLength } }}>
          {field.options?.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      })}</DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</Button></DialogActions>
    </form>
  </Dialog>
}

export function ConfirmModal({ title, text, onConfirm, onClose, label = 'Confirmar' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function confirm() { setBusy(true); try { await onConfirm(); onClose() } catch (err) { setError(err); setBusy(false) } }
  return <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-title"><DialogTitle id="confirm-title">{title}</DialogTitle>
    <DialogContent><p>{text}</p><ErrorNotice error={error}/></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy} color="error" variant="contained" onClick={confirm}>{busy ? 'Procesando…' : label}</Button></DialogActions></Dialog>
}

export function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<Typography component="h1" variant="h4">{title}</Typography>{description && <p className="muted">{description}</p>}</div>{action}</div>
}

export function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date)
}

export function Pagination({ meta, page, onChange }) {
  return <div className="pagination"><span>{meta?.total || 0} resultados · Página {page} de {Math.max(1, meta?.total_pages || 1)}</span><div><Button disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button><Button disabled={page >= (meta?.total_pages || 1)} onClick={() => onChange(page + 1)}>Siguiente</Button></div></div>
}
