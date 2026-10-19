import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createCodexSynthesis} from '../codex-synthesis'

const {invoke, native, channels, decode} = vi.hoisted(() => ({
  channels: [] as Array<{onmessage: (value: null) => void}>,
  decode: vi.fn(),
  invoke: vi.fn(),
  native: vi.fn(() => true),
}))
vi.mock('@tauri-apps/api/core', () => ({
  Channel: class {
    onmessage = (_: null) => undefined
    constructor() {
      channels.push(this)
    }
  },
  invoke,
  isTauri: native,
}))
class Decoder {
  static instances: Decoder[] = []
  close = vi.fn().mockResolvedValue(undefined)
  decodeAudioData = decode
  constructor() {
    Decoder.instances.push(this)
  }
}
afterEach(() => {
  vi.resetAllMocks()
  native.mockReturnValue(true)
  channels.length = 0
  Decoder.instances = []
  vi.unstubAllGlobals()
})
const stubRuntime = () => {
  vi.stubGlobal('AudioContext', Decoder)
  invoke.mockResolvedValue(new ArrayBuffer(4))
  decode.mockResolvedValue({getChannelData: () => Float32Array.of(0.1, 0.2), sampleRate: 24_000})
}
it('should request speech through the native bridge and reuse its decoder', async () => {
  stubRuntime()
  const client = createCodexSynthesis()
  const status = vi.fn()
  const audio = await client.generate(
    '숫자 3과 `text`',
    DEFAULT_POFFO_VOICE,
    new AbortController().signal,
    {status: status},
  )
  expect(invoke).toHaveBeenCalledWith(
    'synthesize_codex_voice',
    expect.objectContaining({
      language: 'ko',
      requestId: expect.any(String),
      text: '숫자 3과 `text`',
    }),
  )
  expect(status).toHaveBeenCalledWith('generating')
  expect(audio).toEqual({sampleRate: 24_000, samples: Float32Array.of(0.1, 0.2)})
  await client.generate('다음 문장', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: status,
  })
  expect(Decoder.instances).toHaveLength(1)
  client.dispose()
  expect(Decoder.instances[0].close).toHaveBeenCalledOnce()
})
it('should cancel before native registration and cancel again when native acknowledges readiness', async () => {
  stubRuntime()
  invoke.mockImplementation((method: string) =>
    method === 'cancel_codex_voice' ? Promise.resolve() : new Promise(() => {}),
  )
  const client = createCodexSynthesis()
  const controller = new AbortController()
  const pending = client.generate('취소할 내용', DEFAULT_POFFO_VOICE, controller.signal, {
    status: vi.fn(),
  })
  const cancelled = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  await cancelled
  const requestId = invoke.mock.calls[0][1].requestId
  expect(invoke).toHaveBeenLastCalledWith('cancel_codex_voice', {requestId})
  channels[0].onmessage(null)
  expect(invoke).toHaveBeenLastCalledWith('cancel_codex_voice', {requestId})
  expect(Decoder.instances).toHaveLength(0)
  client.dispose()
})
it('should abort decoding immediately and discard late decoder output', async () => {
  stubRuntime()
  let finish: (value: unknown) => void = () => undefined
  let entered: () => void = () => undefined
  const decoding = new Promise<void>((resolve) => {
    entered = resolve
  })
  decode.mockImplementationOnce(() => {
    entered()
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const client = createCodexSynthesis()
  const controller = new AbortController()
  const pending = client.generate('읽기', DEFAULT_POFFO_VOICE, controller.signal, {status: vi.fn()})
  const cancelled = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  await decoding
  controller.abort()
  await cancelled
  finish({getChannelData: () => Float32Array.of(1), sampleRate: 24_000})
  client.dispose()
})
it('should not send text if cancelled by a generation-status observer', async () => {
  stubRuntime()
  const client = createCodexSynthesis()
  const controller = new AbortController()
  await expect(
    client.generate('읽기', DEFAULT_POFFO_VOICE, controller.signal, {
      status: () => controller.abort(),
    }),
  ).rejects.toMatchObject({name: 'AbortError'})
  expect(invoke).not.toHaveBeenCalled()
  client.dispose()
})
it('should stop pending synthesis when disposed and reject later requests', async () => {
  stubRuntime()
  invoke.mockImplementation((method: string) =>
    method === 'cancel_codex_voice' ? Promise.resolve() : new Promise(() => {}),
  )
  const client = createCodexSynthesis()
  const pending = client.generate('읽기', DEFAULT_POFFO_VOICE, new AbortController().signal, {
    status: vi.fn(),
  })
  const cancelled = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  client.dispose()
  await cancelled
  await expect(
    client.generate('다음', DEFAULT_POFFO_VOICE, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toMatchObject({name: 'AbortError'})
})
it('should report login failure without switching to local synthesis', async () => {
  stubRuntime()
  invoke.mockRejectedValue('loginRequired')
  const client = createCodexSynthesis()
  await expect(
    client.generate('읽기', DEFAULT_POFFO_VOICE, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toThrow('Codex에서 로그인')
  expect(Decoder.instances).toHaveLength(0)
  client.dispose()
})
it('should reject a browser request without starting native synthesis', async () => {
  native.mockReturnValue(false)
  const client = createCodexSynthesis()
  await expect(
    client.generate('읽기', DEFAULT_POFFO_VOICE, new AbortController().signal, {status: vi.fn()}),
  ).rejects.toThrow('데스크톱 앱')
  expect(invoke).not.toHaveBeenCalled()
  client.dispose()
})
