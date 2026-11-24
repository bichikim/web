import type {ArchiveRequest, ArchiveResponse, ExportedArchive, StorageDatabase} from './types'
interface Pending {
  readonly resolve: (value: ArchiveResponse) => void
  readonly reject: (cause: Error) => void
}
export interface ArchiveClient {
  readonly export: (name: string) => Promise<ExportedArchive>
  readonly import: (blob: Blob, expected: StorageDatabase) => Promise<void>
  readonly destroy: () => void
}
/** Owns the archive Worker so parsing large stored models cannot block the manager UI. */
export const createArchiveClient = (): ArchiveClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
  const pending = new Map<number, Pending>()
  let sequence = 0
  let disposed = false
  const destroy = () => {
    if (!disposed) {
      disposed = true
      worker.terminate()
      pending.forEach((p) => p.reject(new Error('Storage archive worker closed')))
      pending.clear()
    }
  }
  worker.onerror = destroy
  worker.onmessageerror = destroy
  worker.onmessage = ({data}: MessageEvent<ArchiveResponse>) => {
    const request = pending.get(data.id)
    if (request !== undefined) {
      pending.delete(data.id)
      if (data.kind === 'error') {
        request.reject(new Error(data.message))
      } else {
        request.resolve(data)
      }
    }
  }
  const request = (message: ArchiveRequest) =>
    new Promise<ArchiveResponse>((resolve, reject) => {
      if (disposed) {
        reject(new Error('Storage archive worker closed'))
        return
      }
      pending.set(message.id, {reject, resolve})
      try {
        worker.postMessage(message)
      } catch (cause) {
        pending.delete(message.id)
        reject(cause)
      }
    })
  return {
    destroy,
    async export(name) {
      sequence += 1
      const response = await request({id: sequence, kind: 'export', name})
      if (response.kind !== 'exported') {
        throw new Error('Unexpected storage export response')
      }
      return response
    },
    async import(blob, expected) {
      sequence += 1
      const response = await request({blob, expected, id: sequence, kind: 'import'})
      if (response.kind !== 'imported') {
        throw new Error('Unexpected storage import response')
      }
    },
  }
}
