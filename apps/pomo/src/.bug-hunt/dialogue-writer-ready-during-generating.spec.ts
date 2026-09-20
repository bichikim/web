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

const createController = (runtime: TestRuntime) => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useDialogueWriter({
      initialRequest: 'test request',
      modelId: 'qwen-2b',
      runtime,
    })
  })

  return {controller, dispose: disposeRoot}
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('bug-hunt: dialogue writer ready during generating', () => {
  it('should keep generating status when a late ready arrives during token streaming', () => {
    const runtime = createRuntime()
    const {controller, dispose} = createController(runtime)

    controller.prepare()
    runtime.emit({type: 'ready'})
    controller.generate()
    runtime.emit({type: 'started'})
    runtime.emit({text: 'partial output', type: 'token'})

    expect(controller.state()).toEqual({status: 'generating'})
    expect(controller.isBusy()).toBe(true)
    expect(controller.output()).toBe('partial output')

    runtime.emit({type: 'ready'})

    expect(controller.state()).toEqual({status: 'generating'})
    expect(controller.isBusy()).toBe(true)

    dispose()
  })
})
