import { useState } from 'react'
import { llamar } from './api.js'

export default function TransferForm({ token, onTransferencia }) {
  const [destinatario, setDestinatario] = useState('')
  const [monto, setMonto] = useState('')
  const [resultado, setResultado] = useState(null)

  async function transferir(e) {
    e.preventDefault()
    if (!destinatario.trim()) {
      setResultado({ tipo: 'alerta', mensaje: 'Ingrese un destinatario' })
      return
    }

    const { data } = await llamar('/transferir', {
      metodo: 'POST',
      token,
      cuerpo: { destinatario, monto },
    })
    setResultado({
      tipo: data.estado === 'error' ? 'error' : 'ok',
      mensaje: data.mensaje || 'Transferencia realizada',
    })
    onTransferencia()
  }

  const icono = { ok: '✅', error: '❌', alerta: '⚠' }

  return (
    <form className="tarjeta" onSubmit={transferir}>
      <h2>Transferir</h2>
      <label>
        Destinatario (RUT)
        <input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="12.345.678-5" />
      </label>
      <label>
        Monto
        <input inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="100000" />
      </label>
      <button type="submit">Transferir</button>
      {resultado && (
        <p className={`aviso ${resultado.tipo}`}>
          {icono[resultado.tipo]} {resultado.mensaje}
        </p>
      )}
    </form>
  )
}
