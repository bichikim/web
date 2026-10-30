/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {createLipSyncPublisher} from '../channel'
import {useSpeechLipSync} from '../use-speech-lipsync'

vi.mock('../channel', () => ({createLipSyncPublisher: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it('should animate unread prose without audio and stop on selection or settings changes', () => {
  const publish = vi.fn()
  vi.mocked(createLipSyncPublisher).mockReturnValue(publish)
  const frames = new Map<number, FrameRequestCallback>()
  let sequence = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    sequence += 1
    frames.set(sequence, callback)
    return sequence
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  const step = (time: number) => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(time))
  }
  const [speech, setSpeech] = createSignal<PoffoSpeech>({
    enabled: true,
    lipsync: {source: 'speech'},
    x: 0.9,
    y: 0.05,
  })
  const [message, setMessage] = createSignal({chat: 'one', id: '1', text: '첫 문장'})
  const hook = renderHook(() => useSpeechLipSync({message, speech, widgetId: () => 'widget'}))
  step(0)
  step(60)
  expect(publish).toHaveBeenLastCalledWith('speech', expect.any(Number), expect.any(String))
  expect(publish.mock.lastCall![1]).toBeGreaterThan(0)
  setMessage({chat: 'two', id: '1', text: '다른 문장'})
  expect(publish).toHaveBeenLastCalledWith('speech', 0)
  step(1000)
  step(3000)
  expect(frames.size).toBe(0)
  setMessage({chat: 'one', id: '1', text: '첫 문장'})
  step(4000)
  step(6000)
  setMessage({chat: 'two', id: '1', text: '다른 문장'})
  expect(frames.size).toBe(0)
  setMessage({chat: 'two', id: '1', text: '다른 문장추가'})
  step(6000)
  step(6060)
  expect(publish.mock.lastCall![1]).toBeGreaterThan(0)
  setSpeech({...speech(), lipsync: {source: 'voice'}})
  hook.result.audioShape('a', 0.8)
  expect(publish).toHaveBeenLastCalledWith('voice', 0.8, 'a')
  setSpeech({...speech(), enabled: false})
  hook.result.audioShape('i', 1)
  expect(publish).toHaveBeenLastCalledWith('voice', 0)
  expect(frames.size).toBe(0)
})
