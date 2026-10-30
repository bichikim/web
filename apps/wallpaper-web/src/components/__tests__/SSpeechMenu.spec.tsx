/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createBrowserSpeechSession} from '../../features/character-speech/browser'
import {useCharacterSpeech} from '../../features/character-speech/use-character-speech'
import {SSpeechMenu} from '../SSpeechMenu'

vi.mock('../../features/character-speech/browser', () => ({createBrowserSpeechSession: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should speak a preset and accept custom lines without activating an empty input', async () => {
  const speak = vi.fn().mockResolvedValue({ok: true})
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  render(() => <SSpeechMenu ready speech={hook.result} />)
  expect(screen.getByRole('button', {name: '대사 선택'}).getAttribute('aria-haspopup')).toBe(
    'dialog',
  )
  const submit = screen.getByRole('button', {name: '말하기'})
  expect(submit.hasAttribute('disabled')).toBe(true)
  const preset = screen.getByRole('button', {name: /^안녕, 나는 애시야\./})
  const fullLine = preset.textContent!.trim()
  expect(fullLine.length).toBeGreaterThan(100)
  expect(fullLine.length).toBeLessThanOrEqual(150)
  fireEvent.click(preset)
  expect(speak.mock.calls[0]![0]).toBe(fullLine)
  await Promise.resolve()
  fireEvent.input(screen.getByRole('textbox', {name: '직접 입력'}), {
    target: {value: '오늘도 안녕!'},
  })
  fireEvent.submit(screen.getByRole('textbox').closest('form')!)
  expect(speak.mock.calls[1]![0]).toBe('오늘도 안녕!')
  await Promise.resolve()
  hook.cleanup()
})

test('should wait for the character and offer stop while speech is pending', () => {
  const speak = vi.fn().mockReturnValue(Promise.withResolvers().promise)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  const view = render(() => <SSpeechMenu ready={false} speech={hook.result} />)
  expect(screen.getByRole('button', {name: /^안녕, 나는 애시야\./}).hasAttribute('disabled')).toBe(
    true,
  )
  view.unmount()
  render(() => <SSpeechMenu ready speech={hook.result} />)
  fireEvent.click(screen.getByRole('button', {name: /^안녕, 나는 애시야\./}))
  fireEvent.click(screen.getByRole('button', {name: '정지'}))
  expect((speak.mock.calls[0]![1] as AbortSignal).aborted).toBe(true)
  expect(screen.queryByRole('button', {name: '정지'})).toBeNull()
  expect(screen.getByRole('button', {name: '말하기'})).toBeTruthy()
})
