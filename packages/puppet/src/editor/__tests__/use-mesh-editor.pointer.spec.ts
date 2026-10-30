/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {useMeshEditor} from '../use-mesh-editor'

const setup = () => {
  const onDocumentChange = vi.fn()
  const {result: editor, cleanup} = renderHook(() =>
    useMeshEditor({
      document: {...createDemoDocument(), motions: []},
      meshEditing: true,
      onDocumentChange,
    }),
  )
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const circle = document.createElementNS(svg.namespaceURI, 'circle')
  svg.append(circle)
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    height: 720,
    left: 0,
    top: 0,
    width: 960,
  } as DOMRect)
  const event = (pointerId: number, currentTarget: Element = svg) =>
    ({
      button: 0,
      clientX: 500,
      clientY: 360,
      currentTarget,
      pointerId,
      stopPropagation: vi.fn(),
    }) as unknown as PointerEvent
  const start = editor.vertices()[4]!
  editor.handlePointerDown(event(1, circle), 'mesh-preview', start)
  return {cleanup, editor, event, onDocumentChange, start}
}

describe('useMeshEditor pointer ownership', () => {
  test('should ignore vertex movement from another pointer', () => {
    const {cleanup, editor, event, start, onDocumentChange} = setup()
    editor.handlePointerMove(event(2))
    expect(editor.vertices()[4]).toEqual(start)
    editor.handlePointerEnd(event(1))
    expect(onDocumentChange).not.toHaveBeenCalled()
    cleanup()
  })

  test.each(['up', 'cancel'])('should retain the owner drag after another pointer %s', (type) => {
    const {cleanup, editor, event, onDocumentChange} = setup()
    editor.handlePointerMove(event(1))
    if (type === 'up') {
      editor.handlePointerEnd(event(2))
    } else {
      editor.handlePointerCancel(event(2))
    }
    expect(onDocumentChange).not.toHaveBeenCalled()
    editor.handlePointerEnd(event(1))
    expect(onDocumentChange).toHaveBeenCalledOnce()
    cleanup()
  })

  test.each(['blur', 'Escape'])('should discard an unfinished vertex drag on %s', (type) => {
    const {cleanup, editor, event, onDocumentChange, start} = setup()
    editor.handlePointerMove(event(1))
    globalThis.dispatchEvent(
      type === 'blur' ? new Event('blur') : new KeyboardEvent('keydown', {key: 'Escape'}),
    )
    expect(editor.vertices()[4]).toEqual(start)
    editor.handlePointerEnd(event(1))
    expect(onDocumentChange).not.toHaveBeenCalled()
    cleanup()
  })
})
