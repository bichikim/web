/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SPoffoSpeechSettings} from '../SPoffoSpeechSettings'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'

afterEach(cleanup)
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterAll(() => {
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})
it('should preserve the position when toggling speech for one widget', () => {
  const save = vi.fn()
  render(() => <SPoffoSpeechSettings value={{enabled: true, x: -0.4, y: 0.8}} onChange={save} />)
  fireEvent.click(screen.getByRole('switch', {name: '이 위젯에 말풍선 표시'}))
  expect(save).toHaveBeenCalledExactlyOnceWith({enabled: false, x: -0.4, y: 0.8})
})

it('should switch body wrapping while preserving this widget position, visibility and voice', () => {
  const save = vi.fn()
  const value = {enabled: true, voice: {...DEFAULT_POFFO_VOICE, enabled: true}, x: -0.4, y: 0.8}
  render(() => <SPoffoSpeechSettings value={value} onChange={save} />)
  expect(screen.getByRole('radio', {name: '자동 줄바꿈'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: '가로 스크롤'}))
  expect(save).toHaveBeenCalledExactlyOnceWith({...value, wrap: false})
})

it('should allow configuring narration while speech display is off without changing visibility', () => {
  const save = vi.fn()
  const value = {enabled: false, voice: DEFAULT_POFFO_VOICE, x: 0.7, y: 0.1}
  render(() => <SPoffoSpeechSettings value={value} onChange={save} />)
  fireEvent.click(screen.getByRole('switch', {name: '말풍선 읽어주기'}))
  expect(save).toHaveBeenCalledExactlyOnceWith({
    ...value,
    voice: {...DEFAULT_POFFO_VOICE, enabled: true},
  })
  expect(screen.getByRole('button', {name: '미리듣기'})).toBeEnabled()
})
