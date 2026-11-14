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
test('should identify a new narration at playback start and retain it through buffering until it ends', () => {
  const reader = {dispose: vi.fn(), retry: vi.fn(), update: vi.fn()}
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
  status('playing')
  expect(hook.result.readoutId()).toBe('first')
  setMessage({chat: 'chat', id: 'second', text: '새 음성'})
  expect(hook.result.readoutId()).toBeUndefined()
  status('playing')
  expect(hook.result.readoutId()).toBe('second')
  status('idle')
  expect(hook.result.readoutId()).toBeUndefined()
})
