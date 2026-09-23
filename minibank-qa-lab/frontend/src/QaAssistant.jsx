import { useState } from 'react'
import { llamar } from './api.js'

export default function QaAssistant() {
  const [requisito, setRequisito] = useState('El usuario no puede transferir más dinero que su saldo.')
  const [respuesta, setRespuesta] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function generar(e) {
    e.preventDefault()
    setCargando(true)
    const { res, data } = await llamar('/ai/casos', { metodo: 'POST', cuerpo: { requisito } })
    if (res.ok) {
      setRespuesta({ ...data, casos: Array.isArray(data.casos) ? data.casos : [] })
    } else if (res.status === 422) {
      setRespuesta({ aviso: 'El requisito debe tener entre 5 y 500 caracteres.', casos: [] })
    } else {
      setRespuesta({ aviso: 'El asistente no está disponible. Intente nuevamente.', casos: [] })
    }
    setCargando(false)
  }

  return (
    <section className="tarjeta asistente">
      <h2>Asistente de QA</h2>
      <p className="nota">La IA propone casos. El QA los revisa, descarta y completa.</p>
      <form onSubmit={generar}>
        <label>
          Requisito
          <textarea rows={3} value={requisito} onChange={(e) => setRequisito(e.target.value)} />
        </label>
        <button type="submit" disabled={cargando}>
          {cargando ? 'Generando…' : 'Generar casos de prueba con IA'}
        </button>
      </form>

      {respuesta && (
        <>
          {respuesta.aviso && <p className="aviso alerta">⚠ {respuesta.aviso}</p>}
          {respuesta.origen === 'openai' && <p className="nota">Generado con {respuesta.modelo}</p>}
          {respuesta.casos.length > 0 && (
            <table>
              <thead>
                <tr><th>ID</th><th>Técnica</th><th>Entrada</th><th>Resultado esperado</th></tr>
              </thead>
              <tbody>
                {respuesta.casos.map((c, i) => (
                  <tr key={i}>
                    <td>{c.id}</td><td>{c.tecnica}</td><td>{c.entrada}</td><td>{c.resultado_esperado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
