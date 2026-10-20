/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {failureResult, successResult} from 'src/features/result'
import {type ChatVoiceRuntime, useChatVoice} from '../index'
import type {
  CreateSupertonicAudioPlayerOptions,
  SupertonicAudioPlayer,
  SupertonicClient,
} from '../../supertonic'

const cleanups: Array<() => void> = []
const setup = () => {
  const audio = {generationTime: 1, sampleRate: 24_000, samples: Float32Array.of(0)}
  const client: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(async () => successResult(audio)),
    generateStream: vi.fn(async function* generateStream() {
      yield successResult({audio, type: 'complete' as const})
    }),
    initialize: vi.fn(async () => successResult(undefined)),
  }
  const players: Array<{
    readonly options: CreateSupertonicAudioPlayerOptions
    readonly player: SupertonicAudioPlayer
  }> = []
  const runtime: ChatVoiceRuntime = {
    createAudioPlayer: (options) => {
      const player = {dispose: vi.fn(), enqueue: vi.fn(), finish: vi.fn()}
      players.push({options, player})
      return player
    },
    createClient: () => client,
  }
  const root = createRoot((dispose) => {
    cleanups.push(dispose)
    return {controller: useChatVoice({runtime}), dispose}
  })
  return {...root, audio, client, players}
}

afterEach(() => {
  cleanups.splice(0).forEach((dispose) => dispose())
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('should return the same already fulfilled completion before the first arm', async () => {
  const {controller, players} = setup()
  const completion = controller.finish()
  const settled = vi.fn()
  void completion.then(settled)

  expect(controller.finish()).toBe(completion)
  expect(settled).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(settled).toHaveBeenCalledOnce()
  controller.stop()
  expect(controller.finish()).toBe(completion)
  expect(players).toHaveLength(0)
})

it('should share one pending completion and settle repeated playback ends only once', async () => {
  const {controller, players} = setup()
  controller.arm()
  const completion = controller.finish()
  const settled = vi.fn()
  void completion.then(settled)

  expect(players).toHaveLength(1)
  expect(controller.finish()).toBe(completion)
  expect(players[0]?.player.finish).toHaveBeenCalledOnce()
  await Promise.resolve()
  expect(settled).not.toHaveBeenCalled()
  players[0]?.options.onPlaybackEnd?.()
  players[0]?.options.onPlaybackEnd?.()
  expect(settled).not.toHaveBeenCalled()
  await completion
  expect(settled).toHaveBeenCalledOnce()
  expect(controller.finish()).toBe(completion)
})

it('should settle the replaced arm while keeping stale callbacks out of the next completion', async () => {
  const {controller, players} = setup()
  controller.arm()
  const previous = controller.finish()
  const previousSettled = vi.fn()
  void previous.then(previousSettled)
  controller.arm()
  const current = controller.finish()
  const currentSettled = vi.fn()
  void current.then(currentSettled)

  expect(current).not.toBe(previous)
  expect(players).toHaveLength(2)
  expect(players[0]?.player.dispose).toHaveBeenCalledOnce()
  players[0]?.options.onPlaybackEnd?.()
  await Promise.resolve()
  expect(previousSettled).toHaveBeenCalledOnce()
  expect(currentSettled).not.toHaveBeenCalled()
  players[1]?.options.onPlaybackEnd?.()
  await current
  expect(currentSettled).toHaveBeenCalledOnce()
})

it('should retain completion identity when player finish reenters finish and ends synchronously', async () => {
  const {controller, players} = setup()
  controller.arm()
  const trace: string[] = []
  let nested: Promise<void> | undefined
  expect(players).toHaveLength(1)
  vi.mocked(players[0]!.player.finish).mockImplementation(() => {
    trace.push('finish')
    nested = controller.finish()
    trace.push('reentered')
    players[0]?.options.onPlaybackEnd?.()
    trace.push('ended')
  })
  const completion = controller.finish()
  void completion.then(() => trace.push('settled'))

  expect(nested).toBe(completion)
  expect(trace).toEqual(['finish', 'reentered', 'ended'])
  await completion
  expect(trace).toEqual(['finish', 'reentered', 'ended', 'settled'])
  expect(players[0]?.player.finish).toHaveBeenCalledOnce()
})

it.each(['stop', 'dispose'] as const)(
  'should preserve the completed promise and release the player once on repeated %s',
  async (ending) => {
    const {controller, dispose, players} = setup()
    controller.arm()
    const completion = controller.finish()
    const settled = vi.fn()
    void completion.then(settled)
    const end = ending === 'stop' ? controller.stop : dispose
    end()
    end()

    expect(settled).not.toHaveBeenCalled()
    await completion
    expect(settled).toHaveBeenCalledOnce()
    expect(players[0]?.player.dispose).toHaveBeenCalledOnce()
    expect(controller.finish()).toBe(completion)
  },
)

it.each(['result', 'throw'] as const)(
  'should settle playback before speech completion when generation ends with a %s failure',
  async (ending) => {
    const {client, controller, players} = setup()
    const ready = Promise.withResolvers<void>()
    const marker = new Error('generation failed')
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
      await ready.promise
      if (ending === 'throw') {
        throw marker
      }
      yield failureResult({
        code: 'worker-failed',
        detail: 'generation failed',
        phase: 'generate',
        retryable: true,
      })
    })
    await controller.prepare()
    controller.arm()
    const speech = controller.speak('완료 순서를 확인합니다.')
    const completion = controller.finish()
    const trace: string[] = []
    void completion.then(() => trace.push('playback'))
    void speech.then(() => trace.push('speech'))
    ready.resolve()
    await speech
    await completion

    expect(trace).toEqual(['playback', 'speech'])
    expect(controller.state().status).toBe('error')
    expect(players[0]?.player.dispose).toHaveBeenCalledOnce()
    expect(logged).toHaveBeenCalledTimes(ending === 'throw' ? 1 : 0)
    controller.stop()
    expect(controller.finish()).toBe(completion)
  },
)

it('should release playback on stop while the current speech remains pending until generation settles', async () => {
  const {audio, client, controller, players} = setup()
  const ready = Promise.withResolvers<void>()
  vi.mocked(client.generateStream).mockImplementationOnce(async function* generateStream() {
    await ready.promise
    yield successResult({audio, type: 'complete' as const})
  })
  await controller.prepare()
  controller.arm()
  const speech = controller.speak('생성 대기 중 중지합니다.')
  const completion = controller.finish()
  const speechSettled = vi.fn()
  void speech.then(speechSettled)
  controller.stop()
  await completion

  expect(speechSettled).not.toHaveBeenCalled()
  expect(client.cancelGeneration).toHaveBeenCalledOnce()
  expect(players[0]?.player.dispose).toHaveBeenCalledOnce()
  ready.resolve()
  await speech
  expect(speechSettled).toHaveBeenCalledOnce()
  expect(controller.finish()).toBe(completion)
})
