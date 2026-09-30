import { useCallback, useEffect, useState } from 'react'
import { llamar, pesos } from './api.js'
import Login from './Login.jsx'

export default function App() {
  const [token, setToken] = useState(null)
  const [cuenta, setCuenta] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [destinatarios, setDestinatarios] = useState([])
  const [error, setError] = useState('')
  const cargar = useCallback(async () => {
    if (!token) return
    const responses = await Promise.all([
      llamar('/cuenta', { token }), llamar('/movimientos', { token }), llamar('/destinatarios', { token }),
    ])
    if (responses.some(r => r.res.status === 401)) {
      setToken(null); setCuenta(null); setError('Sesión inválida. Vuelva a ingresar.'); return
    }
    if (responses.some(r => !r.res.ok)) {
      setError('No fue posible cargar la cuenta. Revise la conexión.'); return
    }
    setError('')
    setCuenta(responses[0].data)
    setMovimientos(responses[1].data.movimientos)
    setDestinatarios(responses[2].data.destinatarios)
  }, [token])
  useEffect(() => { cargar() }, [cargar])
  async function salir() {
    const { res } = await llamar('/logout', { metodo: 'POST', token })
    if (!res.ok && res.status !== 401) return setError('No fue posible cerrar la sesión. Intente nuevamente.')
    setToken(null); setCuenta(null); setMovimientos([]); setDestinatarios([]); setError('')
  }
  return <main className="pagina">
    <header className="cabecera"><div><strong>MiniBank <span>2.0</span></strong><p className="nota">QA Lab · Operación: convierta el plan en pruebas</p></div>
      {token && <button className="secundario" onClick={salir}>Salir</button>}</header>
    {error && <p role="alert" className="aviso error">{error}</p>}
    {!token && <Login onLogin={setToken} />}
    {token && !cuenta && <p>Cargando cuenta…</p>}
    {token && cuenta && <>
      <section className="saldo"><span>Hola, {cuenta.nombre}</span><strong className="monto">{pesos(cuenta.saldo)}</strong>
        <span>Transferido hoy: {pesos(cuenta.transferido_hoy)} de {pesos(cuenta.limite_diario)}</span>
        <span>Comisión: {pesos(cuenta.comision)} · máximo por transferencia: {pesos(cuenta.maximo_transferencia)}</span></section>
      <div className="columnas">
        <div><Transferir token={token} destinatarios={destinatarios} actualizar={cargar} />
          <section className="tarjeta"><h2>Movimientos</h2>
            {!movimientos.length && <p className="nota">Sin movimientos</p>}
            <ul className="movimientos">{movimientos.map(m => <li key={m.comprobante}>
              <div><strong>{m.comprobante}</strong><span>{m.destinatario}</span><small>{m.fecha}</small></div>
              <strong>-{pesos(m.monto + m.comision)}</strong>
            </li>)}</ul>
          </section>
        </div>
        <div><Registrar token={token} actualizar={cargar} />
          <section className="tarjeta"><h2>Mis destinatarios</h2>
            {!destinatarios.length && <p className="nota">Aún no tiene destinatarios frecuentes.</p>}
            <ul className="destinatarios">{destinatarios.map(d => <li key={d.id}><strong>{d.alias}</strong><span>{d.nombre} · {d.rut}</span></li>)}</ul>
          </section>
        </div>
      </div>
    </>}
    <footer className="nota">Datos de práctica en memoria. Consulte los requisitos y registre evidencia de cada caso.</footer>
  </main>
}

function Transferir({ token, destinatarios, actualizar }) {
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
    setResultado({ ok: res.ok, mensaje: res.ok ? data.mensaje + ' · ' + data.comprobante : 'No fue posible realizar la operación' })
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

function Registrar({ token, actualizar }) {
  const [rut, setRut] = useState('')
  const [nombre, setNombre] = useState('')
  const [alias, setAlias] = useState('')
  const [resultado, setResultado] = useState(null)
  const [busy, setBusy] = useState(false)
  async function guardar(e) {
    e.preventDefault(); setBusy(true)
    const { res, data } = await llamar('/destinatarios', { metodo: 'POST', token, cuerpo: { rut, nombre, alias } })
    setBusy(false)
    setResultado({ ok: res.ok, mensaje: data.mensaje || 'No fue posible conectar con MiniBank' })
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

