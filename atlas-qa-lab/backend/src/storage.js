import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import CFB from 'cfb'
import { encryptBuffer, decryptBuffer } from './crypto.js'
import { ApiError } from './errors.js'

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const formats = {
  pdf: 'application/pdf', doc: 'application/msword', ppt: 'application/vnd.ms-powerpoint',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
}

const root = () => path.resolve(process.env.STORAGE_DIR || './storage')

export function validateDocument(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new ApiError(400, 'ARCHIVO_REQUERIDO', 'Seleccione un documento')
  if (!file.buffer.length) throw new ApiError(400, 'DOCUMENTO_INVALIDO', 'El archivo está vacío')
  if (file.buffer.length >= MAX_DOCUMENT_SIZE) throw new ApiError(413, 'ARCHIVO_DEMASIADO_GRANDE', 'El límite es 10 MiB')
  const name = path.basename(String(file.originalname).replaceAll('\\', '/')).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180)
  const extension = path.extname(name).slice(1).toLowerCase()
  const mime = formats[extension]
  let valid = false
  if (extension === 'pdf') valid = file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
  if (extension === 'jpg' || extension === 'jpeg') valid = file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (extension === 'png') valid = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (extension === 'doc' || extension === 'ppt') {
    const header = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    if (file.buffer.subarray(0, 8).equals(header)) {
      try {
        const compound = CFB.read(file.buffer, { type: 'buffer' })
        const expected = extension === 'doc' ? 'WordDocument' : 'PowerPoint Document'
        valid = compound.FileIndex.some(entry => entry.type === 2 && entry.name === expected && entry.size > 0)
      } catch { valid = false }
    }
  }
  if (!mime || !valid) throw new ApiError(400, 'DOCUMENTO_INVALIDO', 'Use PDF, DOC, PPT, JPG o PNG cuyo contenido coincida con la extensión')
  return { extension: extension === 'jpeg' ? 'jpg' : extension, mime_type: mime, original_name: name, byte_size: file.buffer.length }
}

function safePath(storageKey) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.enc$/i.test(storageKey)) {
    throw new ApiError(400, 'DOCUMENTO_INVALIDO', 'Identificador de almacenamiento inválido')
  }
  return path.join(root(), storageKey)
}

export async function saveDocument(file) {
  const metadata = validateDocument(file)
  await fs.mkdir(root(), { recursive: true, mode: 0o700 })
  const storageKey = `${randomUUID()}.enc`
  await fs.writeFile(safePath(storageKey), encryptBuffer(file.buffer), { flag: 'wx', mode: 0o600 })
  return { ...metadata, storage_key: storageKey }
}

export async function readDocument(storageKey) {
  return decryptBuffer(await fs.readFile(safePath(storageKey)))
}

export async function deleteDocument(storageKey) {
  await fs.rm(safePath(storageKey), { force: true })
}
