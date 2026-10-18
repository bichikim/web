/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {loadWorker, runtimeMocks} from './fixtures/worker'

describe('chat worker preparation', () => {
  it.each([
    {error: new Error('준비 실패'), message: '준비 실패'},
    {error: new Error(), message: '채팅 모델을 실행하지 못했어요.'},
    {error: 'unknown failure', message: '채팅 모델을 실행하지 못했어요.'},
  ])('should report preparation errors as $message', async ({error, message}) => {
    runtimeMocks.prepare.mockRejectedValue(error)
    const worker = await loadWorker()

    await worker.dispatchAndWaitForResponse({modelId: 'qwen-4b', type: 'prepare'}, 'error')
    expect(worker.postMessage).toHaveBeenCalledWith({
      message,
      restartRequired: false,
      type: 'error',
    })
  })
})

describe('chat worker requests', () => {
  it('should report unsupported request types as an error response', async () => {
    const worker = await loadWorker()

    await worker.dispatchAndWaitForResponse({type: 'unknown'}, 'error')

    expect(worker.postMessage).toHaveBeenCalledWith({
      message: '지원하지 않는 채팅 요청이에요.',
      restartRequired: false,
      type: 'error',
    })
  })
})
