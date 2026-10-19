import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createVoiceClient} from '../client'

const {local, chatgpt, player} = vi.hoisted(() => ({
  chatgpt: {dispose: vi.fn(), generate: vi.fn()},
  local: {dispose: vi.fn(), generate: vi.fn()},
  player: {dispose: vi.fn(), enqueue: vi.fn()},
}))
vi.mock('../resident-synthesis', () => ({createResidentSynthesis: vi.fn(() => local)}))
vi.mock('../synthesis', () => ({createSynthesis: vi.fn(() => local)}))
vi.mock('../live-synthesis', () => ({createLiveSynthesis: () => chatgpt}))
vi.mock('../audio-player', () => ({createAudioPlayer: () => player}))
afterEach(() => vi.clearAllMocks())

it('should route local and ChatGPT narration independently without replacing the local synthesis client', async () => {
  const client = createVoiceClient()
  const signal = new AbortController().signal
  const status = vi.fn()
  await client.prepare('local', DEFAULT_POFFO_VOICE, signal, {status: status})
  await client.prepare('remote', {...DEFAULT_POFFO_VOICE, provider: 'chatgpt'}, signal, {
    status: status,
  })
  await client.prepare('local again', DEFAULT_POFFO_VOICE, signal, {status: status})
  expect(local.generate.mock.calls.map(([text]) => text)).toEqual(['local', 'local again'])
  expect(chatgpt.generate).toHaveBeenCalledExactlyOnceWith(
    'remote',
    {...DEFAULT_POFFO_VOICE, provider: 'chatgpt'},
    signal,
    {status},
  )
  client.dispose()
  expect(local.dispose).toHaveBeenCalledOnce()
  expect(chatgpt.dispose).toHaveBeenCalledOnce()
})
it('should route ChatGPT settings speech separately and apply its playback speed', async () => {
  const client = createVoiceClient()
  const signal = new AbortController().signal
  const status = vi.fn()
  const voice = {...DEFAULT_POFFO_VOICE, provider: 'chatgpt' as const, speed: 1.25}
  const audio = {sampleRate: 48000, samples: Float32Array.of(0.1)}
  await client.prepare('ChatGPT 설정 음성', voice, signal, {status: status})
  expect(chatgpt.generate).toHaveBeenCalledExactlyOnceWith('ChatGPT 설정 음성', voice, signal, {
    status,
  })
  expect(local.generate).not.toHaveBeenCalled()
  await client.play(audio, voice, signal)
  expect(player.enqueue).toHaveBeenCalledWith(audio, 80, signal, 1.25)
  client.dispose()
  expect(chatgpt.dispose).toHaveBeenCalledOnce()
})
it('should apply ChatGPT playback speed and preserve the existing locally synthesized speed', async () => {
  const client = createVoiceClient()
  const audio = {sampleRate: 24_000, samples: Float32Array.of(0.1)}
  const signal = new AbortController().signal
  await client.play(audio, {...DEFAULT_POFFO_VOICE, provider: 'chatgpt', speed: 1.5}, signal)
  expect(player.enqueue).toHaveBeenLastCalledWith(audio, 80, signal, 1.5)
  await client.play(audio, {...DEFAULT_POFFO_VOICE, speed: 1.5}, signal)
  expect(player.enqueue).toHaveBeenLastCalledWith(audio, 80, signal, 1)
  client.dispose()
})

it('should retain local models only for narration and keep previews on their own disposable worker', async () => {
  const {createSynthesis} = await import('../synthesis')
  const {createResidentSynthesis} = await import('../resident-synthesis')
  const preview = createVoiceClient()
  expect(createSynthesis).toHaveBeenCalledOnce()
  expect(createResidentSynthesis).not.toHaveBeenCalled()
  preview.dispose()
  const narration = createVoiceClient({retainLocalModel: true})
  expect(createResidentSynthesis).toHaveBeenCalledOnce()
  expect(createSynthesis).toHaveBeenCalledOnce()
  narration.dispose()
})
