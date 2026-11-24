import {afterEach, expect, test, vi} from 'vitest'
import {createArchiveClient} from '../create-archive-client'
import type {ArchiveRequest, ArchiveResponse} from '../types'

class ArchiveWorker {
  static current: ArchiveWorker
  onmessage: ((event: MessageEvent<ArchiveResponse>) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  postMessage = vi.fn<(message: ArchiveRequest) => void>()
  terminate = vi.fn()
  constructor() {
    ArchiveWorker.current = this
  }
}
afterEach(() => vi.unstubAllGlobals())
test('should match archive replies and reject work after disposal', async () => {
  vi.stubGlobal('Worker', ArchiveWorker)
  const client = createArchiveClient()
  const request = client.export('wallpaper-settings')
  const worker = ArchiveWorker.current
  const message = worker.postMessage.mock.calls[0][0]
  const response: ArchiveResponse = {
    blob: new Blob(['data']),
    database: {length: 4, name: 'wallpaper-settings', sha256: 'hash'},
    id: message.id,
    kind: 'exported',
  }
  worker.onmessage?.({data: response} as MessageEvent<ArchiveResponse>)
  await expect(request).resolves.toEqual(response)
  client.destroy()
  client.destroy()
  expect(worker.terminate).toHaveBeenCalledTimes(1)
  await expect(client.export('wallpaper-settings')).rejects.toThrow('worker closed')
  expect(worker.postMessage).toHaveBeenCalledTimes(1)
})
test('should reject pending work when the archive worker fails', async () => {
  vi.stubGlobal('Worker', ArchiveWorker)
  const client = createArchiveClient()
  const request = client.export('wallpaper-settings')
  const rejected = expect(request).rejects.toThrow('worker closed')
  ArchiveWorker.current.onerror?.()
  await rejected
  expect(ArchiveWorker.current.terminate).toHaveBeenCalledTimes(1)
})
