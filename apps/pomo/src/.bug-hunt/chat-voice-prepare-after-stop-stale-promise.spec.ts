import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {type ChatVoiceController, type ChatVoiceRuntime, useChatVoice} from '../features/chat-voice'
import {
  type CreateSupertonicAudioPlayerOptions,
  type SupertonicAudioPlayer,
  type SupertonicClient,
} from '../features/supertonic'
import {successResult} from 'src/features/result'

let releaseInitialization: () => void = () => undefined

const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(async function* generateStream() {}),
  initialize: vi.fn(async () => {
    await new Promise<void>((resolve) => {
      releaseInitialization = resolve
    })
    return successResult(undefined)
  }),
})

const createAudioPlayer = (options: CreateSupertonicAudioPlayerOptions): SupertonicAudioPlayer => ({
  dispose: vi.fn(),
  enqueue: vi.fn(),
  finish: vi.fn(),
})

const createTestRoot = (runtime: ChatVoiceRuntime) => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useChatVoice({runtime})
  })

  return {controller, dispose: disposeRoot}
}

describe('useChatVoice prepare after stop', () => {
  it('should reach ready when prepare is called again after stop during in-flight preparation', async () => {
    const client = createClient()
    const runtime: ChatVoiceRuntime = {
      createAudioPlayer,
      createClient: () => client,
    }
    const chatVoice = createTestRoot(runtime)

    const firstPreparation = chatVoice.controller.prepare()
    expect(chatVoice.controller.state().status).toBe('preparing')

    chatVoice.controller.stop()
    expect(chatVoice.controller.state().status).toBe('unprepared')

    const secondPreparation = chatVoice.controller.prepare()
    releaseInitialization()
    await firstPreparation
    await secondPreparation

    expect(chatVoice.controller.state().status).toBe('ready')
    chatVoice.dispose()
  })
})
