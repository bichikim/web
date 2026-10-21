/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {type SpeechRect, useElementRect} from '../../speech'
import {useSpeechSize} from '../use-speech-size'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('../../speech/use-element-rect', () => ({useElementRect: vi.fn()}))
afterEach(() => vi.clearAllMocks())

it('should keep the screen-sized native viewport unchanged when content or the character anchor moves', () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  const [bounds, setBounds] = createSignal<SpeechRect>({height: 300, width: 320, x: 0, y: 0})
  const [viewport, setViewport] = createSignal<SpeechRect>({height: 640, width: 320, x: 0, y: 0})
  vi.mocked(useElementRect).mockReturnValueOnce(bounds).mockReturnValueOnce(viewport)
  const hook = renderHook(() =>
    useSpeechSize(() => document.createElement('div'), {viewport: () => null}),
  )
  const heights = () =>
    vi.mocked(invoke).mock.calls.map(([, options]) => (options as {height: number}).height)
  expect(heights()).toEqual([])
  setBounds((value) => ({...value, height: 180}))
  setBounds((value) => ({...value, height: 500}))
  setBounds((value) => ({...value, height: 200}))
  expect(heights()).toEqual([])
  setViewport((value) => ({...value, height: 420}))
  expect(heights()).toEqual([])
  setViewport((value) => ({...value, height: 900}))
  expect(heights()).toEqual([])
  hook.cleanup()
})

it('should allow outer scrolling only while measured content genuinely exceeds the native viewport', () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const [bounds, setBounds] = createSignal<SpeechRect>({height: 200, width: 320, x: 0, y: 0})
  const [frame, setFrame] = createSignal<SpeechRect>({height: 400, width: 320, x: 0, y: 0})
  vi.mocked(useElementRect).mockReturnValueOnce(bounds).mockReturnValueOnce(frame)
  const hook = renderHook(() => useSpeechSize(() => null, {viewport: () => null}))
  expect(hook.result.overflow()).toBe(false)
  setBounds((value) => ({...value, height: 500}))
  expect(hook.result.overflow()).toBe(true)
  setFrame((value) => ({...value, height: 572}))
  expect(hook.result.overflow()).toBe(false)
  setBounds((value) => ({...value, height: 200}))
  setFrame((value) => ({...value, height: 272}))
  expect(hook.result.overflow()).toBe(false)
  hook.cleanup()
})
