/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {requestCloudText} from '../../cloud-text/client'
import {CLOUD_TEXT_RESPONSE} from '../../cloud-text/__tests__/fixtures/response'
import type {CloudTextResponse} from '../../cloud-text/contracts'
import {calculateSajuReading} from '../../saju/calculate-reading'
import {createSajuClient} from '../../saju/client'

vi.mock('../../cloud-text/client', () => ({requestCloudText: vi.fn()}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('DEV', false)
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it.each(['cloud', 'gemma-4-e2b', 'lfm-2.6b-qad'] as const)(
  'should preserve the production catalog model %s through the reading client',
  async (modelId) => {
    const {getTextModel} = await import('../model')
    const selectedId = getTextModel(modelId).id
    if (selectedId !== modelId) {
      throw new Error(`The catalog changed the selected model: ${modelId}`)
    }
    const calculation = calculateSajuReading({
      birth: {calendar: 'solar', date: '1995-03-16'},
      gender: 'N',
      question: '제 일은 어떨까요?',
    })
    if (calculation.type !== 'generate') {
      throw new Error('Expected a generated reading')
    }
    const request = {...calculation.request, modelId: selectedId, requestId: 'catalog-reading'}
    const pending = Promise.withResolvers<CloudTextResponse>()
    vi.mocked(requestCloudText).mockReturnValue(pending.promise)
    const worker = Object.assign(new EventTarget(), {postMessage: vi.fn(), terminate: vi.fn()})
    vi.stubGlobal(
      'Worker',
      vi.fn(function createWorker() {
        return worker
      }),
    )
    const onResponse = vi.fn()
    const client = createSajuClient(onResponse, selectedId)
    try {
      client.generate(request)
      if (selectedId === 'cloud') {
        expect(Worker).not.toHaveBeenCalled()
        expect(requestCloudText).toHaveBeenCalledExactlyOnceWith(
          {maximumTokens: 768, messages: request.messages, requestId: expect.any(String)},
          expect.any(AbortSignal),
        )
        pending.resolve(CLOUD_TEXT_RESPONSE)
        await pending.promise
        expect(onResponse).toHaveBeenLastCalledWith({
          requestId: request.requestId,
          text: CLOUD_TEXT_RESPONSE.text,
          type: 'complete',
        })
      } else {
        expect(requestCloudText).not.toHaveBeenCalled()
        expect(Worker).toHaveBeenCalledOnce()
        expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(request)
        const response = {requestId: request.requestId, text: '기기 풀이', type: 'complete'}
        worker.dispatchEvent(new MessageEvent('message', {data: response}))
        expect(onResponse).toHaveBeenCalledExactlyOnceWith(response)
      }
    } finally {
      client.dispose()
    }
    if (selectedId !== 'cloud') {
      expect(worker.terminate).toHaveBeenCalledOnce()
    }
  },
)
