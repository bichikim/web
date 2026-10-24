/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {importPsd} from '../import-psd'

const workers: Array<WorkerFixture> = []
class WorkerFixture extends EventTarget {
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    super()
    workers.push(this)
  }
}
beforeEach(() => {
  workers.length = 0
  vi.stubGlobal('Worker', WorkerFixture)
  vi.stubGlobal('OffscreenCanvas', class {})
})
afterEach(() => vi.unstubAllGlobals())

test('should terminate PSD processing when cancelled', async () => {
  const controller = new AbortController()
  const pending = importPsd(new File([], 'model.psd'), controller.signal)
  const reason = new DOMException('Cancelled', 'AbortError')
  controller.abort(reason)
  await expect(pending).rejects.toBe(reason)
  expect(workers[0]!.terminate).toHaveBeenCalledOnce()
})

test('should return the decoded document and release its worker', async () => {
  const result = {document: createDemoDocument(), ok: true, warnings: []}
  const pending = importPsd(new File([], 'model.psd'))
  workers[0]!.dispatchEvent(new MessageEvent('message', {data: result}))
  await expect(pending).resolves.toEqual(result)
  expect(workers[0]!.terminate).toHaveBeenCalledOnce()
})

test('should report a decoding failure and release a failed worker', async () => {
  const pending = importPsd(new File([], 'model.psd'))
  workers[0]!.dispatchEvent(new Event('error'))
  await expect(pending).resolves.toEqual({error: {code: 'decode-failed'}, ok: false})
  expect(workers[0]!.terminate).toHaveBeenCalledOnce()
})
