import {exportArchive, hashArchive, importArchive} from './archive'
import type {ArchiveRequest, ArchiveResponse} from './types'
const processMessage = async (request: ArchiveRequest) => {
  try {
    let response: ArchiveResponse
    if (request.kind === 'export') {
      const blob = await exportArchive(request.name)
      response = {
        blob,
        database: {length: blob.size, name: request.name, sha256: await hashArchive(blob)},
        id: request.id,
        kind: 'exported',
      }
    } else {
      await importArchive(request.blob, request.expected)
      response = {id: request.id, kind: 'imported'}
    }
    self.postMessage(response)
  } catch (cause) {
    self.postMessage({
      id: request.id,
      kind: 'error',
      message: cause instanceof Error ? cause.message : String(cause),
    } satisfies ArchiveResponse)
  }
}
let pending = Promise.resolve()
self.addEventListener('message', ({data}: MessageEvent<ArchiveRequest>) => {
  pending = pending.then(() => processMessage(data))
})
