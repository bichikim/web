import {invoke, isTauri} from '@tauri-apps/api/core'
import {afterEach, expect, it, vi} from 'vitest'
import {transcribeAudio} from '../transcribe-audio'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => vi.resetAllMocks())

it('should send PCM to the desktop BuzzASR model with Silero enabled and no enhancement', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue('인식한 문장')
  const result = await transcribeAudio({
    audio: new Float32Array([0.2, -0.2]),
    model: 'buzzasr-korean-q8',
    signal: new AbortController().signal,
    vad: true,
  })
  expect(result).toBe('인식한 문장')
  expect(invoke).toHaveBeenCalledExactlyOnceWith('transcribe_local_audio', {
    request: {
      audio: [expect.closeTo(0.2), expect.closeTo(-0.2)],
      id: expect.any(String),
      model: 'buzzasr-korean-q8',
      vad: true,
    },
  })
})

it('should cancel native inference and discard late results', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const result = Promise.withResolvers<string>()
  vi.mocked(invoke).mockReturnValueOnce(result.promise).mockResolvedValue(undefined)
  const controller = new AbortController()
  const pending = transcribeAudio({
    audio: new Float32Array([0]),
    model: 'buzzasr-korean-q8',
    signal: controller.signal,
    vad: false,
  })
  const arguments_ = vi.mocked(invoke).mock.calls[0][1] as {request: {id: string}}
  controller.abort()
  result.resolve('늦은 결과')
  await expect(pending).rejects.toMatchObject({name: 'AbortError'})
  expect(invoke).toHaveBeenLastCalledWith('cancel_local_transcription', {
    id: arguments_.request.id,
  })
})

it('should translate native runtime failures into actionable feedback', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockRejectedValue('runtimeMissing')
  await expect(
    transcribeAudio({
      audio: new Float32Array([0]),
      model: 'buzzasr-korean-q8',
      signal: new AbortController().signal,
      vad: true,
    }),
  ).rejects.toThrow('앱을 다시 빌드')
})

it('should report desktop-only availability without silently changing the selected model', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  await expect(
    transcribeAudio({
      audio: new Float32Array([0]),
      model: 'buzzasr-korean-q8',
      signal: new AbortController().signal,
      vad: true,
    }),
  ).rejects.toThrow('데스크톱')
  expect(invoke).not.toHaveBeenCalled()
})
