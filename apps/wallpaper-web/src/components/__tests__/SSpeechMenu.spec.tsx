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

test('should stop a pending preset without expanding custom input', () => {
  const speak = vi.fn().mockReturnValue(Promise.withResolvers().promise)
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak,
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  render(() => <SSpeechMenu ready speech={hook.result} />)
  const disclosure = screen.getByRole('button', {name: '직접 입력'})
  expect(disclosure.getAttribute('aria-expanded')).toBe('false')
  const preset = screen.getByRole('button', {name: /^안녕, 나는 애시야\./})
  fireEvent.click(preset)
  expect(preset.hasAttribute('disabled')).toBe(true)
  const stop = screen.getByRole('button', {name: '정지'})
  stop.focus()
  fireEvent.click(stop)
  expect((speak.mock.calls[0]![1] as AbortSignal).aborted).toBe(true)
  expect(disclosure.getAttribute('aria-expanded')).toBe('false')
  expect(preset.hasAttribute('disabled')).toBe(false)
  expect(document.activeElement).toBe(preset)
  hook.cleanup()
})

test('should return focus to custom input when stopping before the character is ready', () => {
  vi.mocked(createBrowserSpeechSession).mockReturnValue({
    dispose: vi.fn(),
    speak: vi.fn().mockReturnValue(Promise.withResolvers().promise),
    unlock: vi.fn().mockResolvedValue(undefined),
  })
  const hook = renderHook(useCharacterSpeech)
  render(() => <SSpeechMenu ready={false} speech={hook.result} />)
  void hook.result.speak('안녕')
  const stop = screen.getByRole('button', {name: '정지'})
  stop.focus()
  fireEvent.click(stop)
  expect(document.activeElement).toBe(screen.getByRole('button', {name: '직접 입력'}))
  hook.cleanup()
})

test('should focus an enabled control when the speech dialog opens before the character is ready', () => {
  const hook = renderHook(useCharacterSpeech)
  render(() => <SSpeechMenu ready={false} speech={hook.result} />)
  const opened = new Event('toggle')
  Object.defineProperty(opened, 'newState', {value: 'open'})
  fireEvent(screen.getByRole('dialog', {name: '말하기'}), opened)
  expect(document.activeElement).toBe(screen.getByRole('button', {name: '직접 입력'}))
  hook.cleanup()
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
  const disclosure = screen.getByRole('button', {name: '직접 입력'})
  expect(disclosure.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(disclosure)
  expect(disclosure.getAttribute('aria-expanded')).toBe('true')
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
  fireEvent.click(disclosure)
  expect(disclosure.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(disclosure)
  expect((screen.getByRole('textbox', {name: '직접 입력'}) as HTMLTextAreaElement).value).toBe(
    '오늘도 안녕!',
  )
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
  fireEvent.click(screen.getByRole('button', {name: '직접 입력'}))
  fireEvent.click(screen.getByRole('button', {name: /^안녕, 나는 애시야\./}))
  fireEvent.click(screen.getByRole('button', {name: '정지'}))
  expect((speak.mock.calls[0]![1] as AbortSignal).aborted).toBe(true)
  expect(screen.queryByRole('button', {name: '정지'})).toBeNull()
  expect(screen.getByRole('button', {name: '말하기'})).toBeTruthy()
})
