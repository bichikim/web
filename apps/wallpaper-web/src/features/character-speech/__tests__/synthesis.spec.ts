import {beforeEach, expect, test, vi} from 'vitest'
import {createSpeechSynthesis} from '../synthesis'

class SpeechWorker extends EventTarget {
  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
}
let worker: SpeechWorker
beforeEach(() => {
  worker = new SpeechWorker()
})

test('should record an idle worker failure before another generation can wait for a reply', () => {
  const client = createSpeechSynthesis(worker)
  try {
    worker.dispatchEvent(new Event('error'))
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(() => client.generate('다음 대사', new AbortController().signal, vi.fn())).toThrow()
  } finally {
    client.dispose()
  }
})

test('should reject the active request and dispose even if posting the cancellation fails', async () => {
  const client = createSpeechSynthesis(worker)
  const controller = new AbortController()
  const pending = client.generate('취소할 대사', controller.signal, vi.fn())
  worker.postMessage.mockImplementationOnce(() => {
    throw new Error('Disconnected worker')
  })
  client.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
  return expect(pending).rejects.toMatchObject({name: 'AbortError'})
})

test('should reject an active request when a worker message cannot be decoded', async () => {
  const client = createSpeechSynthesis(worker)
  const pending = client.generate('테스트', new AbortController().signal, vi.fn())
  worker.dispatchEvent(new Event('messageerror'))
  await expect(pending).rejects.toThrow('Speech worker failed')
  expect(worker.terminate).toHaveBeenCalledOnce()
  client.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
})

test('should reject and release the worker if the initial command cannot be sent', async () => {
  const client = createSpeechSynthesis(worker)
  worker.postMessage.mockImplementationOnce(() => {
    throw new Error('Disconnected worker')
  })
  await expect(client.generate('테스트', new AbortController().signal, vi.fn())).rejects.toThrow(
    'Speech worker failed',
  )
  client.dispose()
  expect(worker.terminate).toHaveBeenCalledOnce()
})

test('should ignore cancelled replies and deliver a later request normally', async () => {
  const client = createSpeechSynthesis(worker)
  const controller = new AbortController()
  const first = client.generate('취소', controller.signal, vi.fn())
  controller.abort()
  await expect(first).rejects.toMatchObject({name: 'AbortError'})
  const status = vi.fn()
  const second = client.generate('다음', new AbortController().signal, status)
  worker.dispatchEvent(new MessageEvent('message', {data: {id: 1, type: 'error'}}))
  worker.dispatchEvent(
    new MessageEvent('message', {data: {id: 2, status: {phase: 'generating'}, type: 'status'}}),
  )
  const audio = new Blob(['audio'])
  worker.dispatchEvent(new MessageEvent('message', {data: {audio, id: 2, type: 'audio'}}))
  expect(await second).toBe(audio)
  expect(status).toHaveBeenCalledWith({phase: 'generating'})
  client.dispose()
})
