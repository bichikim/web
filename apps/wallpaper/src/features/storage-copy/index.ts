import {invoke, isTauri} from '@tauri-apps/api/core'
import {type ArchiveClient, createArchiveClient} from './create-archive-client'
import type {StorageDatabase, StorageManifest} from './types'
const CHUNK_BYTES = 4_194_304
const exportStorage = async (client: ArchiveClient) => {
  const names = (await indexedDB.databases()).flatMap(({name}) =>
    name?.startsWith('wallpaper-') ? [name] : [],
  )
  const databases: StorageDatabase[] = []
  for (const [index, name] of names.entries()) {
    // eslint-disable-next-line no-await-in-loop -- Preserve database and chunk ownership until the native write completes.
    const {blob, database} = await client.export(name)
    for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
      // eslint-disable-next-line no-await-in-loop -- The transport validates exact append offsets.
      const bytes = await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer()
      // eslint-disable-next-line no-await-in-loop -- Acknowledgement bounds outstanding binary storage.
      await invoke('append_storage_export', bytes, {
        headers: {'x-database-index': String(index), 'x-file-offset': String(offset)},
      })
    }
    // eslint-disable-next-line no-await-in-loop -- Hash the same immutable export that was transferred.
    databases.push(database)
  }
  const manifest: StorageManifest = {
    databases,
    localStorage: Object.fromEntries(Object.entries(localStorage)),
  }
  await invoke('stage_storage_copy', {manifest})
}
const importStorage = async (manifest: StorageManifest, client: ArchiveClient) => {
  for (const [index, database] of manifest.databases.entries()) {
    const chunks: ArrayBuffer[] = []
    for (let offset = 0; offset < database.length; offset += CHUNK_BYTES) {
      // eslint-disable-next-line no-await-in-loop -- Request one bounded export chunk at a time.
      chunks.push(await invoke<ArrayBuffer>('read_storage_export', {index, offset}))
    }
    // eslint-disable-next-line no-await-in-loop -- Commit and verify each database before mounting any settings consumer.
    await client.import(new Blob(chunks, {type: 'application/json'}), database)
  }
  for (const [key, value] of Object.entries(manifest.localStorage)) {
    const current = localStorage.getItem(key)
    if (current !== null && current !== value) {
      throw new Error('Existing local settings differ from the original copy')
    }
    localStorage.setItem(key, value)
  }
  await invoke('complete_storage_copy')
}
const runArchive = async (operation: (client: ArchiveClient) => Promise<void>) => {
  const client = createArchiveClient()
  try {
    await operation(client)
  } finally {
    client.destroy()
  }
}
/** Gates settings consumers until original-origin storage has been copied and verified. */
export const prepareStorage = async (): Promise<boolean> => {
  if (!isTauri()) {
    return true
  }
  const surface = new URL(location.href).searchParams.get('surface')
  if (surface === 'storage-origin') {
    try {
      await runArchive(exportStorage)
    } catch (cause) {
      await invoke('fail_storage_copy', {
        error: cause instanceof Error ? cause.message : String(cause),
      })
      throw cause
    }
    return false
  }
  const manifest = await invoke<StorageManifest | null>('pending_storage_copy')
  if (manifest !== null) {
    try {
      await runArchive((client) => importStorage(manifest, client))
    } catch (cause) {
      console.error('Cannot copy original settings', cause)
      throw cause
    }
  }
  return true
}
export * from './archive'
export * from './create-archive-client'
export * from './create-archive-stream'
export * from './types'
