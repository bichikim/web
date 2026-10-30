/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {SStorySpeech} from '../SStorySpeech'
import {useCharacterSpeech} from '../../features/character-speech'
import {createBrowserSpeechSession} from '../../features/character-speech/browser'
import chapters from '../../data/story/chapters.json'
const overview = chapters[0]!

vi.mock('../../features/character-speech/browser', () => ({createBrowserSpeechSession: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should let the user stop automatic narration and replay the displayed overview', () => {
  const speak = vi.fn().mockReturnValue(Promise.withResolvers().promise)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  render(() => <SStorySpeech speech={hook.result} text={overview.description} />)
  hook.result.speak(overview.description)
  const signal = speak.mock.calls[0]![1] as AbortSignal
  fireEvent.click(screen.getByRole('button', {name: '소개 음성 멈추기'}))
  expect(signal.aborted).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: '소개 음성 듣기'}))
  expect(speak.mock.calls[1]![0]).toBe(overview.description)
})
