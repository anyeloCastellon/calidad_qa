import { useCallback, useEffect, useRef, useState } from 'react'
import { llamar, pesos } from './api.js'
import Login from './Login.jsx'
import Documentos, { esVistaDocumento } from './Documentos.jsx'

const TOKEN_KEY = 'minibank-v3-token'

function leerToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function guardarToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* La sesión actual puede continuar si el almacenamiento no está disponible. */ }
}

export default function App() {
  const [token, setToken] = useState(leerToken)
  const sesionActual = useRef(token)
  const [cuenta, setCuenta] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [destinatarios, setDestinatarios] = useState([])
  const [error, setError] = useState('')

  const limpiarSesion = useCallback((mensaje = '') => {
    sesionActual.current = null
    guardarToken(null)
    setToken(null); setCuenta(null); setMovimientos([]); setDestinatarios([]); setError(mensaje)
  }, [])

  const sesionInvalida = useCallback((tokenSolicitud) => {
    if (sesionActual.current === tokenSolicitud) {
      limpiarSesion('Sesión inválida o expirada. Vuelva a ingresar.')
    }
  }, [limpiarSesion])

  function iniciarSesion(nuevoToken) {
    sesionActual.current = nuevoToken
    guardarToken(nuevoToken)
    setCuenta(null); setMovimientos([]); setDestinatarios([]); setError(''); setToken(nuevoToken)
  }

  const cargar = useCallback(async () => {
    if (!token) return
    const responses = await Promise.all([
      llamar('/cuenta', { token }), llamar('/movimientos', { token }), llamar('/destinatarios', { token }),
    ])
    if (sesionActual.current !== token) return
    if (responses.some(r => r.res.status === 401)) return sesionInvalida(token)
    if (responses.some(r => !r.res.ok)) {
      const fallida = responses.find(r => !r.res.ok)
      setError(fallida.data.mensaje || 'No fue posible cargar la cuenta. Revise la conexión.'); return
    }
    setError('')
    setCuenta(responses[0].data)
    setMovimientos(responses[1].data.movimientos)
    setDestinatarios(responses[2].data.destinatarios)
  }, [token, sesionInvalida])

  useEffect(() => { cargar() }, [cargar])

  async function actualizarCuenta() {
    const { res, data } = await llamar('/cuenta', { token })
    if (sesionActual.current !== token) return
    if (res.status === 401) return sesionInvalida(token)
    if (!res.ok) return setError(data.mensaje || 'No fue posible actualizar la cuenta. Revise la conexión.')
    setError(''); setCuenta(data)
  }

  async function actualizarDestinatarios() {
    const { res, data } = await llamar('/destinatarios', { token })
    if (sesionActual.current !== token) return
    if (res.status === 401) return sesionInvalida(token)
    if (!res.ok) return setError(data.mensaje || 'No fue posible actualizar los destinatarios. Revise la conexión.')
    setError(''); setDestinatarios(data.destinatarios)
  }

  async function salir() {
    const { res, data } = await llamar('/logout', { metodo: 'POST', token })
    if (sesionActual.current !== token) return
    if (!res.ok && res.status !== 401) {
      return setError(data.mensaje || 'No fue posible cerrar la sesión. Revise la conexión e intente nuevamente.')
    }
    limpiarSesion()
  }

  if (token && cuenta && esVistaDocumento()) {
    return <main className="pagina">
      <header className="cabecera"><div><strong>MiniBank <span>3.0.0-sast-lab</span></strong><p className="nota">Documentos de la cuenta</p></div></header>
      <Documentos token={token} sesionInvalida={sesionInvalida} />
    </main>
  }

  return <main className="pagina">
    <header className="cabecera"><div><strong>MiniBank <span>3.0.0-sast-lab</span></strong><p className="nota">QA Lab · Operación: ¿liberamos esta versión?</p></div>
      {token && <button className="secundario" onClick={salir}>Salir</button>}</header>
    {error && <p role="alert" className="aviso error">{error}</p>}
    {!token && <Login onLogin={iniciarSesion} onUnauthorized={() => limpiarSesion()} />}
    {token && !cuenta && <p role="status">Cargando cuenta…</p>}
    {token && cuenta && <>
      <section className="saldo"><span>Hola, {cuenta.nombre}</span><strong className="monto">{pesos(cuenta.saldo)}</strong>
        <span>Transferido hoy: {pesos(cuenta.transferido_hoy)} de {pesos(cuenta.limite_diario)}</span>
        <span>Comisión: {pesos(cuenta.comision)} · máximo por transferencia: {pesos(cuenta.maximo_transferencia)}</span></section>
      <div className="columnas">
        <div><Transferir token={token} destinatarios={destinatarios} actualizar={actualizarCuenta} sesionInvalida={sesionInvalida} />
          <section className="tarjeta"><h2>Movimientos</h2>
            {!movimientos.length && <p className="nota">Sin movimientos</p>}
            <ul className="movimientos">{movimientos.map(m => <li key={m.comprobante}>
              <div><strong>{m.comprobante}</strong><span>{m.destinatario}</span><small>{m.fecha}</small></div>
              <strong className="importe">-{pesos(m.monto + m.comision)}</strong>
            </li>)}</ul>
          </section>
        </div>
        <div><Registrar token={token} actualizar={actualizarDestinatarios} sesionInvalida={sesionInvalida} />
          <section className="tarjeta"><h2>Mis destinatarios</h2>
            {!destinatarios.length && <p className="nota">Aún no tiene destinatarios frecuentes.</p>}
            <ul className="destinatarios">{destinatarios.map(d => <li key={d.id}><strong>{d.alias}</strong><span>{d.nombre} · {d.rut}</span></li>)}</ul>
          </section>
        </div>
      </div>
      <Documentos token={token} sesionInvalida={sesionInvalida} />
    </>}
    <footer className="nota">Build 3.0.0-sast-lab · Datos de práctica persistentes en SQLite. Consulte los requisitos y registre evidencia de cada caso.</footer>
  </main>
}

function Transferir({ token, destinatarios, actualizar, sesionInvalida }) {
  const [rut, setRut] = useState('')
  const [monto, setMonto] = useState('')
  const [resultado, setResultado] = useState(null)
  const [busy, setBusy] = useState(false)
  async function enviar(e) {
    e.preventDefault()
    if (!/^-?\d+$/.test(monto.trim()) || !Number.isSafeInteger(Number(monto))) {
      setResultado({ ok: false, mensaje: 'Ingrese un monto entero de pesos' }); return
    }
    setBusy(true)
    const { res, data } = await llamar('/transferir', {
      metodo: 'POST', token, cuerpo: { destinatario: rut, monto: Number(monto) },
    })
    setBusy(false)
    if (res.status === 401) return sesionInvalida(token)
    setResultado({
      ok: res.ok,
      mensaje: res.ok ? data.mensaje + ' · ' + data.comprobante : data.mensaje || 'No fue posible conectar con MiniBank. Revise la conexión.',
    })
    await actualizar()
  }
  return <form className="tarjeta" onSubmit={enviar}>
    <h2>Transferir</h2>
    <label>Destinatario (RUT)<input list="frecuentes" value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-5" /></label>
    <datalist id="frecuentes">{destinatarios.map(d => <option key={d.id} value={d.rut}>{d.alias}</option>)}</datalist>
    <label>Monto (pesos)<input inputMode="numeric" value={monto} onChange={e => setMonto(e.target.value)} placeholder="100000" /></label>
    <button disabled={busy}>{busy ? 'Transfiriendo…' : 'Transferir'}</button>
    {resultado && <p role="status" className={'aviso ' + (resultado.ok ? 'ok' : 'error')}>{resultado.mensaje}</p>}
  </form>
}

function Registrar({ token, actualizar, sesionInvalida }) {
  const [rut, setRut] = useState('')
  const [nombre, setNombre] = useState('')
  const [alias, setAlias] = useState('')
  const [resultado, setResultado] = useState(null)
  const [busy, setBusy] = useState(false)
  async function guardar(e) {
    e.preventDefault(); setBusy(true)
    const { res, data } = await llamar('/destinatarios', { metodo: 'POST', token, cuerpo: { rut, nombre, alias } })
    setBusy(false)
    if (res.status === 401) return sesionInvalida(token)
    setResultado({ ok: res.ok, mensaje: data.mensaje || 'No fue posible conectar con MiniBank. Revise la conexión.' })
    if (res.ok) { setRut(''); setNombre(''); setAlias(''); await actualizar() }
  }
  return <form className="tarjeta" onSubmit={guardar}>
    <h2>Nuevo destinatario</h2>
    <label>RUT del destinatario<input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-5" /></label>
    <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} /></label>
    <label>Alias<input value={alias} onChange={e => setAlias(e.target.value)} placeholder="Casa" /></label>
    <p className="nota">Alias: entre 3 y 30 caracteres.</p>
    <button disabled={busy}>{busy ? 'Guardando…' : 'Guardar destinatario'}</button>
    {resultado && <p role="status" className={'aviso ' + (resultado.ok ? 'ok' : 'error')}>{resultado.mensaje}</p>}
  </form>
}
