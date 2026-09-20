/** @vitest-environment node */
/**
 * Bug hunt: useDialogueWriter applies stale worker completes after a newer generate starts.
 * Worker root cause: dialogue-writer/worker.ts lacks in-flight request serialization.
 */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {CreateDialogueClientOptions} from '../features/dialogue-writer/client'
import {useDialogueWriter} from '../features/dialogue-writer/use-dialogue-writer'

it('should not apply a stale complete after a newer generate has already finished', () => {
  let options: CreateDialogueClientOptions | undefined
  const onComplete = vi.fn()
  const controller = createRoot(() =>
    useDialogueWriter({
      modelId: 'qwen-0.8b',
      onComplete,
      runtime: {
        createClient: (nextOptions) => {
          options = nextOptions
          return {dispose: vi.fn(), generate: vi.fn(), prepare: vi.fn()}
        },
        supportsWebGpu: () => true,
      },
    }),
  )

  controller.prepare()
  options?.onResponse({
    files: [],
    loadedBytes: 0,
    percentage: 100,
    totalBytes: 100,
    type: 'loading',
  })
  options?.onResponse({type: 'ready'})

  controller.setRequest('첫 질문')
  controller.generate()
  options?.onResponse({type: 'started'})
  options?.onResponse({text: '두 번째 답변.', type: 'complete'})
  expect(onComplete).toHaveBeenLastCalledWith('두 번째 답변.')
  expect(controller.output()).toBe('두 번째 답변.')

  controller.setRequest('둘째 질문')
  controller.generate()
  options?.onResponse({type: 'started'})
  options?.onResponse({text: '첫 번째 답변.', type: 'complete'})

  expect(onComplete).toHaveBeenLastCalledWith('두 번째 답변.')
  expect(controller.output()).toBe('두 번째 답변.')
  expect(controller.state()).toEqual({status: 'complete'})
})
