/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SCodexStory} from '../SCodexStory'
import {useCharacterSpeech} from '../../features/character-speech'
import {createBrowserSpeechSession} from '../../features/character-speech/browser'
import demo from '../../data/codex-demo.json'

vi.mock('../../features/character-speech/browser', () => ({createBrowserSpeechSession: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should play and stop the Codex example on demand and disable controls during transitions', () => {
  const speak = vi.fn().mockReturnValue(Promise.withResolvers().promise)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  const [playing, setPlaying] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  render(() => <SCodexStory speech={hook.result} ready={ready()} playing={playing()} />)
  expect(screen.getByRole('complementary', {name: 'Codex 연결 예시'})).toBeDefined()
  expect(screen.getByText(demo.text)).toBeDefined()
  const button = screen.getByRole('button', {name: '목소리 듣기'}) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  expect(createBrowserSpeechSession).not.toHaveBeenCalled()
  setPlaying(true)
  expect(button.disabled).toBe(true)
  setReady(true)
  expect(button.disabled).toBe(false)
  fireEvent.click(button)
  expect(speak.mock.calls[0]![0]).toBe(demo.text)
  expect(screen.getByRole('button', {name: '멈추기'})).toBe(button)
  const signal = speak.mock.calls[0]![1] as AbortSignal
  expect(signal.aborted).toBe(false)
  fireEvent.click(screen.getByRole('button', {name: '멈추기'}))
  expect(signal.aborted).toBe(true)
  setPlaying(false)
  expect(button.textContent).toContain('목소리 듣기')
  expect(button.disabled).toBe(true)
})
