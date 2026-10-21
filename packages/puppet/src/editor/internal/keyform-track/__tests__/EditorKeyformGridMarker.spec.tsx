/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {EditorKeyformGridMarker} from '../EditorKeyformGridMarker'

const parameters = [
  {defaultValue: 0, id: 'x', maximum: 30, minimum: -30, name: 'X'},
  {defaultValue: 0, id: 'y', maximum: 30, minimum: -30, name: 'Y'},
]
const setup = () => {
  const onMove = vi.fn()
  const onSelect = vi.fn()
  const view = render(() => (
    <div>
      <EditorKeyformGridMarker
        keyform={{parts: [], values: [0, 0]}}
        parameters={parameters}
        onMove={onMove}
        onSelect={onSelect}
      />
    </div>
  ))
  const marker = view.getByRole('button', {name: '키폼 선택: 0, 0'})
  vi.spyOn(marker.parentElement!, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 120, 120),
  )
  return {marker, onMove, onSelect, view}
}
const pointer = (type: string, pointerId = 1, button = 0) => {
  const event = new MouseEvent(type, {bubbles: true, button, clientX: 90, clientY: 30})
  Object.defineProperties(event, {pointerId: {value: pointerId}, pointerType: {value: 'mouse'}})
  return event
}
afterEach(cleanup)

test.each([
  {key: 'ArrowRight', to: [0.5, 0]},
  {key: 'ArrowLeft', to: [-0.5, 0]},
  {key: 'ArrowUp', to: [0, 0.5]},
  {key: 'ArrowDown', to: [0, -0.5]},
])('should move only the requested axis with $key', ({key, to}) => {
  const {marker, onMove, onSelect} = setup()
  fireEvent.keyDown(marker, {key})
  expect(onMove).toHaveBeenCalledExactlyOnceWith([0, 0], to)
  expect(onSelect).toHaveBeenCalledOnce()
})

test.each([
  {ctrlKey: true},
  {altKey: true},
  {metaKey: true},
  {shiftKey: true},
  {repeat: true},
  {isComposing: true},
])('should ignore modified or repeated movement %j', (options) => {
  const {marker, onMove, onSelect} = setup()
  fireEvent.keyDown(marker, {key: 'ArrowRight', ...options})
  expect(onMove).not.toHaveBeenCalled()
  expect(onSelect).not.toHaveBeenCalled()
})

test('should preview a drag and commit once on its pointer release', () => {
  const {view, marker, onMove, onSelect} = setup()
  marker.dispatchEvent(pointer('pointerdown'))
  globalThis.dispatchEvent(pointer('pointermove'))
  expect(view.getByRole('button', {name: '키폼 선택: 15, 15'})).toBe(marker)
  expect(onMove).not.toHaveBeenCalled()
  globalThis.dispatchEvent(pointer('pointerup'))
  globalThis.dispatchEvent(pointer('pointerup'))
  expect(onMove).toHaveBeenCalledExactlyOnceWith([0, 0], [15, 15])
  expect(onSelect).toHaveBeenCalledOnce()
})

test('should ignore another pointer and discard a cancelled drag', () => {
  const {view, marker, onMove} = setup()
  marker.dispatchEvent(pointer('pointerdown'))
  globalThis.dispatchEvent(pointer('pointermove', 2))
  expect(view.getByRole('button', {name: '키폼 선택: 0, 0'})).toBe(marker)
  globalThis.dispatchEvent(pointer('pointermove'))
  globalThis.dispatchEvent(pointer('pointercancel'))
  globalThis.dispatchEvent(pointer('pointerup'))
  expect(onMove).not.toHaveBeenCalled()
  expect(view.getByRole('button', {name: '키폼 선택: 0, 0'})).toBe(marker)
})

test.each(['Escape', 'blur'])('should discard a drag on %s', (reason) => {
  const {view, marker, onMove} = setup()
  marker.dispatchEvent(pointer('pointerdown'))
  globalThis.dispatchEvent(pointer('pointermove'))
  if (reason === 'Escape') {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
  } else {
    globalThis.dispatchEvent(new Event('blur'))
  }
  globalThis.dispatchEvent(pointer('pointerup'))
  expect(onMove).not.toHaveBeenCalled()
  expect(view.getByRole('button', {name: '키폼 선택: 0, 0'})).toBe(marker)
})

test('should release pending gesture listeners when unmounted', () => {
  const {view, marker, onMove} = setup()
  marker.dispatchEvent(pointer('pointerdown'))
  globalThis.dispatchEvent(pointer('pointermove'))
  view.unmount()
  globalThis.dispatchEvent(pointer('pointerup'))
  expect(onMove).not.toHaveBeenCalled()
})

test('should retain keyboard click selection without pointer click reselection', () => {
  const {marker, onSelect} = setup()
  marker.dispatchEvent(pointer('pointerdown'))
  fireEvent.click(marker, {detail: 1})
  expect(onSelect).toHaveBeenCalledOnce()
  fireEvent.click(marker, {detail: 0})
  expect(onSelect).toHaveBeenCalledTimes(2)
})
