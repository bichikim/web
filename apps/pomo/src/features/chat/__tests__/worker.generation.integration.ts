/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import type {GenerateTextOptions} from '../../text-generation'
import type {ChatWorkerResponse} from '../messages'
import {generateRequest, loadWorker, runtimeMocks, waitForResponse} from './fixtures/worker'

describe('chat worker generation', () => {
  it('should not send ready when prepare arrives during a generation', async () => {
    const firstGeneration = Promise.withResolvers<string>()
    const generationStarted = Promise.withResolvers<void>()
    runtimeMocks.generate.mockImplementationOnce(() => {
      generationStarted.resolve()
      return firstGeneration.promise
    })
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await generationStarted.promise

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })

    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'ready'})

    const completed = worker.waitForNextResponse('complete')
    firstGeneration.resolve(' 첫 답변 ')
    await completed
  })

  it('should ignore a concurrent generate request while one is in flight', async () => {
    const firstGeneration = Promise.withResolvers<string>()
    const generationStarted = Promise.withResolvers<void>()
    runtimeMocks.generate.mockImplementationOnce(() => {
      generationStarted.resolve()
      return firstGeneration.promise
    })
    const worker = await loadWorker()

    worker.dispatch(generateRequest({replyId: 'reply-a'}))
    await generationStarted.promise

    worker.dispatch(generateRequest({replyId: 'reply-b'}))
    const completed = worker.waitForNextResponse('complete')
    firstGeneration.resolve(' 첫 답변 ')
    await completed
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({content: '첫 답변', id: 'reply-a'}),
        type: 'complete',
      }),
    )

    expect(runtimeMocks.generate).toHaveBeenCalledOnce()
    const completeResponses = worker.postMessage.mock.calls
      .map(([response]) => response)
      .filter((response): response is Extract<ChatWorkerResponse, {type: 'complete'}> => {
        return response.type === 'complete'
      })

    expect(completeResponses).toHaveLength(1)
  })

  it('should release the generation guard after a generation failure', async () => {
    runtimeMocks.generate.mockRejectedValueOnce(new Error('첫 생성 실패'))
    const worker = await loadWorker()

    await worker.dispatchAndWaitForResponse(generateRequest({replyId: 'reply-a'}), 'error')
    expect(worker.postMessage).toHaveBeenCalledWith({
      message: '첫 생성 실패',
      restartRequired: false,
      type: 'error',
    })

    await worker.dispatchAndWaitForResponse(generateRequest({replyId: 'reply-b'}), 'complete')
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({id: 'reply-b'}),
        type: 'complete',
      }),
    )

    expect(runtimeMocks.generate).toHaveBeenCalledTimes(2)
  })

  it('should stream only visible text and complete without refinement', async () => {
    runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
      options.onToken?.('보이는 답변')
      options.onToken?.('')
      return ' 보이는 답변 '
    })
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({text: '보이는 답변', type: 'token'})
    expect(worker.postMessage).toHaveBeenCalledWith({
      draft: {content: '보이는 답변', id: 'reply-1'},
      type: 'draft',
    })
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
  })

  it('should stream and retain an answer beyond the former 240-character limit', async () => {
    const answer = '자연스러운 한국어 답변입니다. '.repeat(30)
    runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
      options.onToken?.(answer.slice(0, 200))
      options.onToken?.(answer.slice(200))
      return answer
    })
    const worker = await loadWorker()
    await worker.dispatchAndWaitForResponse(generateRequest(), 'complete')
    expect(worker.postMessage).toHaveBeenCalledWith({text: answer.slice(200), type: 'token'})
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({content: answer.trim()}),
        type: 'complete',
      }),
    )
    expect(runtimeMocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({maximumTokens: 2048}),
    )
  })

  it('should surface generation failures through the worker error response', async () => {
    runtimeMocks.generate.mockRejectedValue(new Error('생성 실패'))
    const worker = await loadWorker()

    await worker.dispatchAndWaitForResponse(generateRequest(), 'error')
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      message: '생성 실패',
      restartRequired: false,
      type: 'error',
    })
  })
})
