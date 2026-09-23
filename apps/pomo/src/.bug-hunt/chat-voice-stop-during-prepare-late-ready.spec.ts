/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {type ChatVoiceRuntime, useChatVoice} from '../features/chat-voice'
import {type InitializeSupertonicOptions, type SupertonicClient} from '../features/supertonic'
import {successResult} from 'src/features/result'

const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(),
  initialize: vi.fn(async () => successResult(undefined)),
})

it('should reset preparing state when stop is called during initialization', async () => {
  let initializeOptions: InitializeSupertonicOptions | undefined
  let releaseInitialization: () => void = () => undefined
  const initialization = new Promise<void>((resolve) => {
    releaseInitialization = resolve
  })
  const client = createClient()
  vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
    initializeOptions = options
    await initialization
    return successResult(undefined)
  })
  const runtime: ChatVoiceRuntime = {
    createAudioPlayer: () => ({
      dispose: vi.fn(),
      enqueue: vi.fn(),
      finish: vi.fn(),
    }),
    createClient: () => client,
  }
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useChatVoice({runtime})
  })

  const preparation = controller.prepare()
  await vi.waitFor(() => expect(initializeOptions).toBeDefined())
  expect(controller.state()).toEqual({progress: 0, status: 'preparing'})

  controller.stop()
  expect(controller.state().status).not.toBe('preparing')

  releaseInitialization()
  await preparation
  disposeRoot()
})

it('should not report ready after stop cancels in-flight preparation', async () => {
  let initializeOptions: InitializeSupertonicOptions | undefined
  let releaseInitialization: () => void = () => undefined
  const initialization = new Promise<void>((resolve) => {
    releaseInitialization = resolve
  })
  const client = createClient()
  vi.mocked(client.initialize).mockImplementationOnce(async (options) => {
    initializeOptions = options
    await initialization
    return successResult(undefined)
  })
  const runtime: ChatVoiceRuntime = {
    createAudioPlayer: () => ({
      dispose: vi.fn(),
      enqueue: vi.fn(),
      finish: vi.fn(),
    }),
    createClient: () => client,
  }
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useChatVoice({runtime})
  })

  const preparation = controller.prepare()
  await vi.waitFor(() => expect(initializeOptions).toBeDefined())
  controller.stop()
  releaseInitialization()
  await preparation

  expect(controller.state().status).not.toBe('ready')
  disposeRoot()
})
