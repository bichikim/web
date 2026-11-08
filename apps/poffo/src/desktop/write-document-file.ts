import {save} from '@tauri-apps/plugin-dialog'
import {writeFile} from '@tauri-apps/plugin-fs'

interface WriteDocumentFileOptions {
  readonly content: Blob
  readonly name: string
  readonly signal?: AbortSignal
}

/** Writes only the path explicitly chosen in the native save dialog. */
export const writeDocumentFile = async ({content, name, signal}: WriteDocumentFileOptions) => {
  signal?.throwIfAborted()
  const path = await save({
    defaultPath: name,
    filters: [{extensions: [name.endsWith('.poffo') ? 'poffo' : 'json'], name: 'Poffo'}],
  })
  signal?.throwIfAborted()
  if (path === null) {
    return false
  }
  await writeFile(path, new Uint8Array(await content.arrayBuffer()))
  return true
}
