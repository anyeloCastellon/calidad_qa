import { useCallback, useEffect, useState } from 'react'
import { llamar, pesos } from './api.js'
import Login from './Login.jsx'
import TransferForm from './TransferForm.jsx'
import QaAssistant from './QaAssistant.jsx'

export default function App() {
  const [token, setToken] = useState(null)
  const [cuenta, setCuenta] = useState(null)

  const cargarCuenta = useCallback(async () => {
    if (!token) return
    const { res, data } = await llamar('/cuenta', { token })
    if (res.status === 401) {
      setToken(null)
      return
    }
    setCuenta(data)
  }, [token])

  useEffect(() => {
    cargarCuenta()
  }, [cargarCuenta])

  async function salir() {
    await llamar('/logout', { metodo: 'POST', token })
    setToken(null)
    setCuenta(null)
  }

  return (
    <div className="pagina">
      <main className="telefono">
        <header>
          <strong>MiniBank</strong>
          {token && <button className="secundario" onClick={salir}>Salir</button>}
        </header>

        {!token && <Login onLogin={setToken} />}

        {token && cuenta && (
          <>
            <section className="saldo">
              <span>Hola, {cuenta.nombre}</span>
              <span className="monto">{pesos(cuenta.saldo)}</span>
              <span className="nota">
                Transferido hoy {pesos(cuenta.transferido_hoy)} de {pesos(cuenta.limite_diario)} · comisión{' '}
                {pesos(cuenta.comision)} por transferencia
              </span>
            </section>

            <TransferForm token={token} onTransferencia={cargarCuenta} />

            <section className="tarjeta">
              <h2>Movimientos</h2>
              {cuenta.movimientos.length === 0 && <p className="nota">Sin movimientos</p>}
              <ul className="movimientos">
                {cuenta.movimientos.map((m) => (
                  <li key={m.comprobante}>
                    <span>{m.comprobante} → {m.destinatario}</span>
                    <span>-{pesos(m.monto + m.comision)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>

      <QaAssistant />
    </div>
  )
}
