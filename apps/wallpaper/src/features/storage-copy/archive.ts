import Dexie from 'dexie'
import {createArchiveStream} from './create-archive-stream'
import {exportDB, importDB, importInto, peakImportFile} from 'dexie-export-import'
import type {StorageDatabase} from './types'
const HEX_RADIX = 16
/** Fingerprints the complete export, including binary fields and schema. */
export const hashArchive = async (blob: Blob): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())))
    .map((byte) => byte.toString(HEX_RADIX).padStart(2, '0'))
    .join('')
/** Reads a database without declaring upgrades or modifying its original records. */
export const exportArchive = async (name: string): Promise<Blob> => {
  const database = await new Dexie(name).open()
  try {
    return await exportDB(database)
  } finally {
    database.close()
  }
}
/** Imports atomically, reuses an identical completed copy and rejects conflicting target data. */
export const importArchive = async (blob: Blob, expected: StorageDatabase): Promise<void> => {
  const metadata = await peakImportFile(blob)
  if (
    metadata.data.databaseName !== expected.name ||
    blob.size !== expected.length ||
    (await hashArchive(blob)) !== expected.sha256
  ) {
    throw new Error('Storage archive changed during transfer')
  }
  if (await Dexie.exists(expected.name)) {
    if ((await hashArchive(await exportArchive(expected.name))) === expected.sha256) {
      return
    }
    const existing = await new Dexie(expected.name).open()
    try {
      const counts = await Promise.all(existing.tables.map((table) => table.count()))
      if (counts.some((count) => count !== 0)) {
        throw new Error('Existing settings differ from the original copy')
      }
      await importInto(existing, await createArchiveStream(blob))
      if ((await hashArchive(await exportDB(existing))) !== expected.sha256) {
        throw new Error('Imported storage does not match its original')
      }
      return
    } finally {
      existing.close()
    }
  }
  const database = await importDB(await createArchiveStream(blob))
  try {
    if ((await hashArchive(await exportDB(database))) !== expected.sha256) {
      throw new Error('Imported storage does not match its original')
    }
  } finally {
    database.close()
  }
}
