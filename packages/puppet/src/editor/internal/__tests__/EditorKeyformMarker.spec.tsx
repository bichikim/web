/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {EditorKeyformMarker} from '../EditorKeyformMarker'

const pointer = (type: string, clientX: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX})
  Object.defineProperty(event, 'pointerId', {value: 1})
  return event
}

test.each(['blur', 'Escape'])('should cancel keyform relocation on %s', (cancel) => {
  const onMove = vi.fn()
  const view = render(() => (
    <div>
      <EditorKeyformMarker
        active
        parameter={{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'p'}}
        value={0}
        onMove={onMove}
      />
    </div>
  ))
  const marker = view.getByRole('button')
  vi.spyOn(marker.parentElement!, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 100, 20),
  )
  fireEvent(marker, pointer('pointerdown', 0))
  globalThis.dispatchEvent(pointer('pointermove', 50))
  expect(marker).toHaveAccessibleName('p 0.5 키폼')
  globalThis.dispatchEvent(
    cancel === 'blur' ? new Event('blur') : new KeyboardEvent('keydown', {key: 'Escape'}),
  )
  globalThis.dispatchEvent(pointer('pointerup', 50))
  expect(onMove).not.toHaveBeenCalled()
  expect(marker).toHaveAccessibleName('p 0 키폼')
})
