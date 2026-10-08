import { useEffect, useRef, useState } from 'react'
import { llamar, pesos } from './api.js'

const documentPassword = 'L4bD0c!27Qr6'

export function esVistaDocumento() {
  return new URLSearchParams(window.location.search).get('vista') === 'documento'
}

function crearPin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function enviarMensaje(documentWindow, mensaje) {
  documentWindow.postMessage(mensaje, '*')
}

export default function Documentos({ token, sesionInvalida }) {
  const vistaDocumento = esVistaDocumento()
  const [formato, setFormato] = useState('actual')
  const [documento, setDocumento] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [busy, setBusy] = useState(false)
  const documentoActual = useRef(null)
  const documentWindowRef = useRef(null)

  useEffect(() => {
    function recibirMensaje(event) {
      const mensaje = event.data
      if (!mensaje || typeof mensaje !== 'object') return
      if (mensaje.tipo === 'minibank-documento-listo' && documentWindowRef.current && documentoActual.current) {
        enviarMensaje(documentWindowRef.current, { tipo: 'minibank-documento', datos: documentoActual.current })
      }
      if (vistaDocumento && mensaje.tipo === 'minibank-documento' && mensaje.datos?.documento) {
        documentoActual.current = mensaje.datos
        setDocumento(mensaje.datos)
        setResultado({ ok: true, mensaje: 'Documento recibido.' })
      }
    }
    window.addEventListener('message', recibirMensaje)
    if (vistaDocumento && window.opener) {
      enviarMensaje(window.opener, { tipo: 'minibank-documento-listo' })
    }
    return () => window.removeEventListener('message', recibirMensaje)
  }, [vistaDocumento])

  async function preparar(e) {
    e.preventDefault(); setBusy(true); setResultado(null)
    const { res, data } = await llamar('/lab/documentos', {
      metodo: 'POST', token,
      cuerpo: { formato, pin_cliente: crearPin(), clave_documentos: documentPassword },
    })
    setBusy(false)
    if (res.status === 401) return sesionInvalida(token)
    if (!res.ok) {
      return setResultado({ ok: false, mensaje: data.mensaje || 'No fue posible preparar el documento. Revise la conexión.' })
    }
    documentoActual.current = data
    setDocumento(data)
    setResultado({ ok: true, mensaje: 'Documento preparado con el estado actual de la cuenta.' })
  }

  function abrir() {
    const documentWindow = window.open(new URL('?vista=documento', window.location.href).href, '_blank')
    if (!documentWindow) {
      return setResultado({ ok: false, mensaje: 'El navegador bloqueó la ventana. Permita ventanas para este laboratorio y vuelva a intentar.' })
    }
    documentWindowRef.current = documentWindow
    setResultado({ ok: true, mensaje: 'Documento abierto en una nueva ventana.' })
  }

  return <section className="tarjeta documentos">
    <h2>{vistaDocumento ? 'Documento de la cuenta' : 'Documentos y autorizaciones'}</h2>
    {!vistaDocumento && <form className="formulario-documentos" onSubmit={preparar}>
      <label>Formato de exportación<select value={formato} onChange={e => setFormato(e.target.value)}>
        <option value="actual">Actual</option>
        <option value="archivo">Archivo</option>
        <option value="legacy">Compatibilidad</option>
      </select></label>
      <button disabled={busy}>{busy ? 'Preparando…' : 'Preparar documento'}</button>
      <button type="button" className="secundario" disabled={!documento || busy} onClick={abrir}>Ver documento en otra ventana</button>
    </form>}
    {resultado && <p role="status" className={'aviso ' + (resultado.ok ? 'ok' : 'error')}>{resultado.mensaje}</p>}
    {vistaDocumento && !documento && <p role="status">Esperando el documento de la ventana principal…</p>}
    {documento && <>
      <dl className="datos-documento">
        <div><dt>Documento</dt><dd>{documento.documento_id}</dd></div>
        <div><dt>Titular</dt><dd>{documento.documento.titular}</dd></div>
        <div><dt>RUT</dt><dd>{documento.documento.rut}</dd></div>
        <div><dt>Saldo</dt><dd>{pesos(documento.documento.saldo)}</dd></div>
        <div><dt>Transferido hoy</dt><dd>{pesos(documento.documento.transferido_hoy)}</dd></div>
        <div><dt>PIN de autorización</dt><dd>{documento.pin_cliente}</dd></div>
        <div><dt>Código del documento</dt><dd>{documento.codigo_autorizacion}</dd></div>
      </dl>
      <p className="nota">Movimientos incluidos: {documento.documento.movimientos?.length || 0}. Datos de práctica tomados al preparar el documento.</p>
      {vistaDocumento && <button className="secundario" onClick={() => window.close()}>Cerrar documento</button>}
    </>}
  </section>
}
