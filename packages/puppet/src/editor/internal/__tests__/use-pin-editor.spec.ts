/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {getSceneNode} from '../scene-graph'
import {usePinEditor} from '../use-pin-editor'

const setup = () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'pin',
  })!
  const node = getSceneNode(document, 'shapes')!
  if (node.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  const change = vi.fn()
  const end = vi.fn()
  const {result: editor, cleanup} = renderHook(() =>
    usePinEditor({document, node, onDocumentChange: change, onEditEnd: end}),
  )
  const svg = globalThis.document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    height: 720,
    left: 0,
    top: 0,
    width: 960,
  } as DOMRect)
  editor.bind(svg)
  const event = (pointerId: number) =>
    ({
      button: 0,
      clientX: 500,
      clientY: 360,
      currentTarget: svg,
      pointerId,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }) as unknown as PointerEvent
  editor.start(event(1), 0)
  return {change, cleanup, editor, end, event}
}

test('should ignore movement and release from another pointer', () => {
  const {change, cleanup, editor, end, event} = setup()
  editor.drag(event(2))
  editor.stop(event(2))
  expect(change).not.toHaveBeenCalled()
  expect(end).not.toHaveBeenCalled()
  editor.drag(event(1))
  expect(change).toHaveBeenCalledOnce()
  editor.stop(event(1))
  expect(end).toHaveBeenCalledOnce()
  cleanup()
})

test('should finish an active gesture on window blur and ignore later moves', () => {
  const {change, cleanup, editor, end, event} = setup()
  globalThis.dispatchEvent(new Event('blur'))
  expect(end).toHaveBeenCalledOnce()
  editor.drag(event(1))
  expect(change).not.toHaveBeenCalled()
  cleanup()
  expect(end).toHaveBeenCalledOnce()
})
