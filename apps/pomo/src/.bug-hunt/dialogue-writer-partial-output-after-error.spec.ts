/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.clearAllMocks()
})

import {
  type DialogueClient,
  type DialogueWriterController,
  type DialogueWriterRuntime,
  useDialogueWriter,
} from '../features/dialogue-writer'
import type {DialogueWorkerResponse} from '../features/dialogue-writer/messages'

interface TestRuntime extends DialogueWriterRuntime {
  readonly client: DialogueClient
  readonly emit: (response: DialogueWorkerResponse) => void
}

const createRuntime = (): TestRuntime => {
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
        throw new Error('client not created')
      }
      onResponse(response)
    },
    supportsWebGpu: vi.fn(() => true),
  }
}

const createController = (runtime: TestRuntime) => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useDialogueWriter({
      initialRequest: '테스트 요청',
      modelId: 'qwen-2b',
      runtime,
    })
  })
  return {controller, dispose: disposeRoot}
}

it('should not offer copy after generation fails with partial streamed output', () => {
  const runtime = createRuntime()
  const root = createController(runtime)
  const {controller} = root

  controller.prepare()
  runtime.emit({type: 'ready'})
  controller.generate()
  runtime.emit({type: 'started'})
  runtime.emit({text: '중간까지 생성된 ', type: 'token'})
  runtime.emit({message: '생성 실패', restartRequired: false, type: 'error'})

  expect(controller.state()).toMatchObject({status: 'error'})
  expect(controller.output()).toBe('중간까지 생성된 ')
  expect(controller.canCopy()).toBe(false)
  root.dispose()
})
