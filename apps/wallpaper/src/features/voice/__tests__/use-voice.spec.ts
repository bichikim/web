/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useVoice} from '../use-voice'
import {createReadout} from '../readout'
import {createVoiceClient} from '../client'
vi.mock('../readout', () => ({createReadout: vi.fn()}))
vi.mock('../client', () => ({createVoiceClient: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
test('should extend audible text only for appended prose and keep rewritten or queued responses separate', () => {
  vi.mocked(createReadout).mockReturnValue({
    dispose: vi.fn(),
    retry: vi.fn(),
    toggle: vi.fn(),
    update: vi.fn(),
  })
  const original = {chat: 'chat', id: 'reply', text: '슬프고 속상했어요.'}
  const [message, setMessage] = createSignal(original)
  const hook = renderHook(() => useVoice({message, speech: () => ({enabled: true, x: 0, y: 0})}))
  vi.mocked(createReadout).mock.calls[0][0].onPlayback?.({message: original, offset: 0})
  const appended = {...original, text: `${original.text} 그래도 다시 시도했어요.`}
  setMessage(appended)
  expect(hook.result.playback()?.message).toEqual(appended)
  setMessage({...original, text: '정말 기쁜 소식이에요!'})
  expect(hook.result.playback()?.message).toEqual(original)
  setMessage({...original, id: 'queued', text: '다음에 읽을 응답'})
  expect(hook.result.playback()?.message).toEqual(original)
  setMessage({...original, chat: 'other'})
  expect(hook.result.playback()).toBeNull()
})
test('should identify a new narration at playback start and retain it through buffering until it ends', () => {
  const reader = {
    dispose: vi.fn(),
    retry: vi.fn(),
    toggle: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
  }
  vi.mocked(createReadout).mockReturnValue(reader)
  vi.mocked(createVoiceClient, {partial: true}).mockReturnValue({})
  const [message, setMessage] = createSignal({chat: 'chat', id: 'first', text: '일반 문장'})
  const hook = renderHook(() =>
    useVoice({message, speech: () => ({enabled: true, x: 0.9, y: 0.05})}),
  )
  const status = vi.mocked(createReadout).mock.calls[0]![0].onStatus
  status('generating')
  expect(hook.result.readoutId()).toBeUndefined()
  status('playing')
  expect(hook.result.readoutId()).toBe('first')
  status('buffering')
  expect(hook.result.readoutId()).toBe('first')
  status('paused')
  expect(hook.result.readoutId()).toBe('first')
  status('playing')
  expect(hook.result.readoutId()).toBe('first')
  setMessage({chat: 'chat', id: 'second', text: '새 음성'})
  expect(hook.result.readoutId()).toBeUndefined()
  status('playing')
  expect(hook.result.readoutId()).toBe('second')
  status('idle')
  expect(hook.result.readoutId()).toBeUndefined()
})
test('should expose playback only for enabled nonempty narration and report control failures', async () => {
  const reader = {
    dispose: vi.fn(),
    retry: vi.fn(),
    toggle: vi.fn().mockRejectedValue(new Error('resume failed')),
    update: vi.fn(),
  }
  vi.mocked(createReadout).mockReturnValue(reader)
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const [message, setMessage] = createSignal<{chat: string; id: string; text: string} | null>(null)
  const hook = renderHook(() => useVoice({message, speech: () => ({enabled: true, x: 0, y: 0})}))
  expect(hook.result.available()).toBe(false)
  setMessage({chat: 'chat', id: '1', text: '현재 말풍선'})
  expect(hook.result.available()).toBe(true)
  await hook.result.toggle()
  expect(hook.result.error()).toBe('resume failed')
  expect(report).toHaveBeenCalledOnce()
  report.mockRestore()
})
