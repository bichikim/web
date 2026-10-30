/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {Position} from '@dschz/solid-flow'
import {MappingEdge} from '../MappingEdge'
const mocks = vi.hoisted(() => ({connect: vi.fn(), edit: vi.fn()}))
vi.mock('../context', () => ({
  useMappingGraph: () => ({onConnect: mocks.connect, onEdit: mocks.edit}),
}))
vi.mock('@dschz/solid-flow', () => ({
  BezierEdge: () => <path />,
  Position: {Left: 'left', Right: 'right'},
  useSolidFlow: () => ({screenToFlowPosition: (point: {x: number; y: number}) => point}),
}))
afterEach(() => {
  vi.clearAllMocks()
  Reflect.deleteProperty(document, 'elementFromPoint')
})
const mount = () => {
  render(() => (
    <svg>
      <MappingEdge
        id="edge"
        source="manual"
        target="parameter:angle"
        sourceHandleId="manualValue"
        targetHandleId="angle"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={0}
        sourcePosition={Position.Right}
        targetPosition={Position.Left}
        selected
      />
    </svg>
  ))
  const handle = screen.getByRole('button', {name: '출력 연결 끝 이동'})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  const destination = document.createElement('div')
  destination.setAttribute('data-nodeid', 'parameter:next')
  destination.setAttribute('data-handleid', 'next')
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => destination,
  })
  return handle
}
const pointer = (element: Element, type: string, pointerId: number) =>
  fireEvent(
    element,
    Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX: 10, clientY: 20}), {
      pointerId,
    }),
  )
test.each(['pointerup', 'pointercancel'])(
  'should ignore a foreign %s during an edge drag',
  (type) => {
    const handle = mount()
    pointer(handle, 'pointerdown', 1)
    pointer(handle, type, 2)
    expect(mocks.connect).not.toHaveBeenCalled()
    pointer(handle, 'pointerup', 1)
    expect(mocks.connect).toHaveBeenCalledExactlyOnceWith({
      previousId: 'angle',
      source: 'manual',
      sourceHandle: 'manualValue',
      target: 'parameter:next',
      targetHandle: 'next',
    })
  },
)
test('should discard an edge drag after its pointer capture is lost', () => {
  const handle = mount()
  pointer(handle, 'pointerdown', 1)
  pointer(handle, 'lostpointercapture', 1)
  pointer(handle, 'pointerup', 1)
  expect(mocks.connect).not.toHaveBeenCalled()
})
