import nodemailer from 'nodemailer'
import fs from 'node:fs'
import { config } from './config.js'

export const mailer = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'mail', port: Number(process.env.SMTP_PORT || 1025), secure: false, requireTLS: true, tls: { rejectUnauthorized: true, servername: process.env.SMTP_SERVERNAME || 'mail', ca: fs.readFileSync(process.env.SMTP_CA || '/certs/ca.crt') }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, logger: false, debug: false })
export async function sendConfirmation(email, token) {
  await mailer.sendMail({ from: process.env.SMTP_FROM || 'Cuidarte+ <no-reply@cuidarte.example>', to: email, subject: 'Confirme su cuenta en Cuidarte+', text: `Confirme su cuenta usando este enlace:\n${config.publicUrl}/confirmar?token=${encodeURIComponent(token)}\nEl enlace vence en 24 horas.` })
}
