import {link, open, rename, rm} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {randomUUID} from 'node:crypto'

export interface WriteDocumentPathOptions {
  /** Destination chosen by the caller. Its parent directory must already exist. */
  readonly path: string
  /** Complete validated file content to persist. */
  readonly content: Blob
  /** Explicit permission to replace an existing destination; omitted, preserve it. */
  readonly overwrite?: boolean
  /** Cancels before final publication; omitted, complete the write. */
  readonly signal?: AbortSignal
}

/** Publishes a completed file from a sibling temporary file, preserving the old destination on preparation failure. */
const PRIVATE_FILE = 0o600

export const writeDocumentPath = async (options: WriteDocumentPathOptions): Promise<void> => {
  const {signal, path} = options
  signal?.throwIfAborted()
  const temporary = join(dirname(path), `.poffo-${randomUUID()}.tmp`)
  try {
    const handle = await open(temporary, 'wx', PRIVATE_FILE)
    try {
      await handle.writeFile(new Uint8Array(await options.content.arrayBuffer()), {signal})
      await handle.sync()
    } finally {
      await handle.close()
    }
    signal?.throwIfAborted()
    if (options.overwrite === true) {
      await rename(temporary, path)
    } else {
      await link(temporary, path)
    }
  } finally {
    await rm(temporary, {force: true})
  }
}
