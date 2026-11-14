/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {TimelineMotionName} from '../TimelineMotionName'

const renderName = () => {
  const onDelete = vi.fn()
  const view = render(() => (
    <TimelineMotionName motionId="idle" motionIds={['idle']} onDelete={onDelete} />
  ))
  return {button: view.getByRole('button', {name: 'idle 모션 이름'}), onDelete}
}

const pointer = (type: string, pointerId: number, clientX = 200) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX})
  Object.defineProperty(event, 'pointerId', {value: pointerId})
  return event
}

test('should require a second Delete press instead of deleting on key repeat', () => {
  const {button, onDelete} = renderName()
  fireEvent.keyDown(button, {key: 'Delete'})
  fireEvent.keyDown(button, {key: 'Delete', repeat: true})
  expect(onDelete).not.toHaveBeenCalled()
  fireEvent.keyDown(button, {key: 'Delete'})
  expect(onDelete).toHaveBeenCalledOnce()
})

test.each([
  {ctrlKey: true},
  {metaKey: true},
  {altKey: true},
  {shiftKey: true},
  {isComposing: true},
])('should not arm motion deletion for a modified or composing key: %j', (options) => {
  const {button, onDelete} = renderName()
  fireEvent.keyDown(button, {key: 'Delete', ...options})
  fireEvent.keyDown(button, {key: 'Delete'})
  expect(onDelete).not.toHaveBeenCalled()
  fireEvent.keyDown(button, {key: 'Delete'})
  expect(onDelete).toHaveBeenCalledOnce()
})

test('should ignore other pointers while swiping a motion name', () => {
  const {button, onDelete} = renderName()
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 2, 100))
  globalThis.dispatchEvent(pointer('pointerup', 2, 100))
  expect(onDelete).not.toHaveBeenCalled()
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  globalThis.dispatchEvent(pointer('pointerup', 2, 100))
  expect(onDelete).not.toHaveBeenCalled()
  globalThis.dispatchEvent(pointer('pointerup', 1, 100))
  expect(onDelete).toHaveBeenCalledOnce()
})

test('should discard an armed motion swipe on window blur', () => {
  const {button, onDelete} = renderName()
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  globalThis.dispatchEvent(new Event('blur'))
  globalThis.dispatchEvent(pointer('pointerup', 1, 100))
  expect(onDelete).not.toHaveBeenCalled()
})

test('should delete on a completed leftward swipe and ignore a rightward swipe', () => {
  const {button, onDelete} = renderName()
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 300))
  globalThis.dispatchEvent(pointer('pointerup', 1, 300))
  expect(onDelete).not.toHaveBeenCalled()
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  globalThis.dispatchEvent(pointer('pointerup', 1, 100))
  expect(onDelete).toHaveBeenCalledOnce()
})

test.each(['pointercancel', 'dispose'])('should discard an armed motion swipe on %s', (reason) => {
  const onDelete = vi.fn()
  const view = render(() => (
    <TimelineMotionName motionId="idle" motionIds={['idle']} onDelete={onDelete} />
  ))
  view.getByRole('button', {name: 'idle 모션 이름'}).dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  if (reason === 'dispose') {
    view.unmount()
  } else {
    globalThis.dispatchEvent(pointer('pointercancel', 1, 100))
  }
  globalThis.dispatchEvent(pointer('pointerup', 1, 100))
  expect(onDelete).not.toHaveBeenCalled()
})

test.each(['Enter', 'F2'])('should retain renaming with %s after deletion is armed', (key) => {
  const onRename = vi.fn()
  const onDelete = vi.fn()
  const view = render(() => (
    <TimelineMotionName
      motionId="idle"
      motionIds={['idle']}
      onDelete={onDelete}
      onRename={onRename}
    />
  ))
  const button = view.getByRole('button', {name: 'idle 모션 이름'})
  fireEvent.keyDown(button, {key: 'Delete'})
  fireEvent.keyDown(button, {key})
  const input = view.getByRole('textbox', {name: '모션 이름'})
  expect(input).toHaveFocus()
  fireEvent.input(input, {target: {value: 'renamed'}})
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(onRename).toHaveBeenCalledExactlyOnceWith('renamed')
  fireEvent.keyDown(view.getByRole('button', {name: 'idle 모션 이름'}), {key: 'Delete'})
  expect(onDelete).not.toHaveBeenCalled()
})

test('should cancel the entire swipe gesture on Escape before later pointer movement', () => {
  const {button, onDelete} = renderName()
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  fireEvent.keyDown(button, {key: 'Escape'})
  globalThis.dispatchEvent(pointer('pointermove', 1, 90))
  globalThis.dispatchEvent(pointer('pointerup', 1, 90))
  expect(onDelete).not.toHaveBeenCalled()
})

test('should cancel an active swipe when keyboard renaming starts', () => {
  const onDelete = vi.fn()
  const view = render(() => (
    <TimelineMotionName
      motionId="idle"
      motionIds={['idle']}
      onDelete={onDelete}
      onRename={vi.fn()}
    />
  ))
  const button = view.getByRole('button', {name: 'idle 모션 이름'})
  button.dispatchEvent(pointer('pointerdown', 1))
  globalThis.dispatchEvent(pointer('pointermove', 1, 100))
  fireEvent.keyDown(button, {key: 'F2'})
  expect(view.getByRole('textbox', {name: '모션 이름'})).toHaveFocus()
  globalThis.dispatchEvent(pointer('pointermove', 1, 90))
  globalThis.dispatchEvent(pointer('pointerup', 1, 90))
  expect(onDelete).not.toHaveBeenCalled()
})
