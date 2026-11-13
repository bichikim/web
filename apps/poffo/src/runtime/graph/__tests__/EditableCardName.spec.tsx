/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {EditableCardName} from '../EditableCardName'

const setup = () => {
  const rename = vi.fn()
  render(() => <EditableCardName name="원래 이름" label="카드 이름" onRename={rename} />)
  fireEvent.doubleClick(screen.getByRole('button', {name: '원래 이름 이름 바꾸기'}))
  const input = screen.getByRole('textbox', {name: '카드 이름'})
  return {input, rename}
}

it.each(['Enter', 'Escape'])('should retain editing during a composing %s', (key) => {
  const {input, rename} = setup()
  fireEvent.input(input, {target: {value: '조합 중'}})
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: true,
    key,
  })
  fireEvent(input, event)
  expect(event.defaultPrevented).toBe(false)
  expect(rename).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', {name: '카드 이름'})).toBe(input)
  expect(input).toHaveFocus()
  expect(input).toHaveValue('조합 중')
})

it('should trim and commit a noncomposing Enter once', () => {
  const {input, rename} = setup()
  fireEvent.input(input, {target: {value: ' 새 이름 '}})
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(rename).toHaveBeenCalledExactlyOnceWith('새 이름')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('should discard an ordinary Escape without renaming', () => {
  const {input, rename} = setup()
  fireEvent.input(input, {target: {value: '취소할 이름'}})
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(rename).not.toHaveBeenCalled()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '원래 이름 이름 바꾸기'})).toBeInTheDocument()
})

it('should commit a name on blur', () => {
  const {input, rename} = setup()
  fireEvent.input(input, {target: {value: '다른 이름'}})
  fireEvent.blur(input)
  expect(rename).toHaveBeenCalledExactlyOnceWith('다른 이름')
})

it('should leave the name unchanged when the draft is blank', () => {
  const {input, rename} = setup()
  fireEvent.input(input, {target: {value: '  '}})
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(rename).not.toHaveBeenCalled()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
