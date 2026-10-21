import https from 'node:https'
import { config, readCertificate, validateConfiguration } from './config.js'
import { initializeDatabase, pool } from './db.js'
import { createApp } from './app.js'
import { mailer } from './mail.js'

validateConfiguration()
await initializeDatabase()
const server = https.createServer({ cert: readCertificate(process.env.TLS_CERT || '/certs/backend.crt'),
  key: readCertificate(process.env.TLS_KEY || '/certs/backend.key'), minVersion: 'TLSv1.2' }, createApp())
server.requestTimeout = 30_000
server.headersTimeout = 15_000
server.listen(config.port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'atlas_started', build: config.build, port: config.port, database: 'postgresql' })))
async function shutdown() {
  server.close(async () => { mailer.close(); await pool.end(); process.exit(0) })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
