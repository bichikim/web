/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {
  type DialogueClient,
  type DialogueWriterRuntime,
  useDialogueWriter,
} from '../features/dialogue-writer'
import type {DialogueWorkerResponse} from '../features/dialogue-writer/messages'

const createRuntime = (): DialogueWriterRuntime & {
  readonly client: DialogueClient
  readonly emit: (response: DialogueWorkerResponse) => void
} => {
  let onResponse: ((response: DialogueWorkerResponse) => void) | null = null
  const client: DialogueClient = {
    dispose: vi.fn(),
    generate: vi.fn(),
    prepare: vi.fn(),
  }

  return {
    client,
    createClient: vi.fn((options) => {
      onResponse = options.onResponse
      return client
    }),
    emit: (response) => {
      if (onResponse === null) {
        throw new Error('Dialogue client was not created.')
      }

      onResponse(response)
    },
    supportsWebGpu: vi.fn(() => true),
  }
}

it('should discard in-flight generation when the request text changes', () => {
  const runtime = createRuntime()
  const onComplete = vi.fn()
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useDialogueWriter({
      initialRequest: '첫 번째 요청',
      modelId: 'qwen-2b',
      onComplete,
      runtime,
    })
  })

  controller.prepare()
  runtime.emit({type: 'ready'})
  controller.generate()
  runtime.emit({type: 'started'})
  runtime.emit({text: '이전 ', type: 'token'})

  controller.setRequest('두 번째 요청')
  runtime.emit({text: '토큰', type: 'token'})
  runtime.emit({text: '이전 출력', type: 'complete'})

  expect(controller.request()).toBe('두 번째 요청')
  expect(controller.output()).toBe('')
  expect(controller.state()).toEqual({status: 'ready'})
  expect(onComplete).not.toHaveBeenCalled()

  disposeRoot()
})
