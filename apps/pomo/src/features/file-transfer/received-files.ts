import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import {createStore} from 'solid-js/store'
import {createBlobArchive} from 'src/utils/create-blob-archive'

export const RECEIVED_BYTES_LIMIT = 300_000_000

type RemovalReason = 'capacity' | 'manual'

export interface ReceivedFile {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly mimeType: string
  readonly url: string | null
  readonly removed: RemovalReason | null
  readonly saved: boolean
}

interface ReceivedState {
  files: Array<ReceivedFile>
  saving: boolean
  error: boolean
}

const download = (url: string, name: string): void => {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
}

/** Keeps received file contents in this page until removed or evicted by the byte limit. */
export const createReceivedFiles = (maximumBytes = RECEIVED_BYTES_LIMIT) => {
  const [state, setState] = createStore<ReceivedState>({error: false, files: [], saving: false})
  const contents = new Map<string, Blob>()
  let archiveUrl: string | null = null
  const releaseArchive = (): void => {
    archiveUrl = replaceBlobObjectUrl(archiveUrl, () => null)
  }
  const retainedBytes = () =>
    state.files.reduce((total, file) => total + (file.url === null ? 0 : file.size), 0)
  const remove = (id: string, reason: RemovalReason = 'manual'): void => {
    const file = state.files.find((item) => item.id === id)
    if (file === undefined) {
      return
    }
    releaseArchive()
    if (file.url !== null) {
      replaceBlobObjectUrl(file.url, () => null)
      contents.delete(id)
    }
    if (reason === 'manual') {
      setState('files', (files) => files.filter((item) => item.id !== id))
    } else {
      setState('files', (item) => item.id === id, {removed: reason, url: null})
    }
  }
  const add = (blob: Blob, name: string): void => {
    releaseArchive()
    const id = crypto.randomUUID()
    contents.set(id, blob)
    setState('files', (files) => [
      ...files,
      {
        id,
        mimeType: blob.type,
        name,
        removed: null,
        saved: false,
        size: blob.size,
        url: replaceBlobObjectUrl(null, () => blob),
      },
    ])
    let bytes = retainedBytes()
    for (const file of state.files) {
      if (bytes > maximumBytes && file.url !== null) {
        bytes -= file.size
        remove(file.id, 'capacity')
      }
    }
  }
  const save = (id: string): void => {
    const file = state.files.find((item) => item.id === id)
    if (file === undefined || file.url === null) {
      return
    }
    download(file.url, file.name)
    setState('files', (item) => item.id === id, {saved: true})
  }
  const removeAll = (): void => {
    const filesToRemove = state.files.slice()
    for (const file of filesToRemove) {
      remove(file.id)
    }
    setState({files: []})
  }
  const clearRemoved = (): void => {
    setState('files', (files) => files.filter((file) => file.url !== null))
  }
  const saveAll = async (): Promise<void> => {
    if (state.saving) {
      return
    }
    const files = state.files.filter((file) => file.url !== null)
    const entries = files.flatMap((file) => {
      const blob = contents.get(file.id)
      return blob === undefined ? [] : [{blob, name: file.name}]
    })
    if (files.length === 0) {
      return
    }
    setState({error: false, saving: true})
    try {
      const archive = await createBlobArchive(entries)
      archiveUrl = replaceBlobObjectUrl(archiveUrl, () => archive)
      download(archiveUrl, 'pomo-files.zip')
      const ids = new Set(files.map((file) => file.id))
      setState('files', (file) => ids.has(file.id), {saved: true})
    } catch {
      setState('error', true)
    } finally {
      setState('saving', false)
    }
  }
  return {add, clearRemoved, remove, removeAll, retainedBytes, save, saveAll, state}
}
