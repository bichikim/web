/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

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
        throw new Error('dialogue client was not created')
      }

      onResponse(response)
    },
    supportsWebGpu: vi.fn(() => true),
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('dialogue writer request edits after completion', () => {
  it('should clear completed output when the request text changes', () => {
    const runtime = createRuntime()
    let disposeRoot: () => void = () => undefined
    let controller: DialogueWriterController

    controller = createRoot((dispose) => {
      disposeRoot = dispose
      return useDialogueWriter({
        initialRequest: '첫 질문',
        modelId: 'qwen-2b',
        runtime,
      })
    })

    controller.prepare()
    runtime.emit({type: 'ready'})
    controller.generate()
    runtime.emit({type: 'started'})
    runtime.emit({text: '첫 답변', type: 'complete'})

    expect(controller.output()).toBe('첫 답변')
    expect(controller.state()).toEqual({status: 'complete'})

    controller.setRequest('바뀐 질문')

    expect(controller.output()).toBe('')
    expect(controller.state().status).not.toBe('complete')

    disposeRoot()
  })
})
