/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'

import {SpatialMeshPreview} from '../SpatialMeshPreview'

const operation = {
  center: [50, 50, 0],
  id: 'body',
  mode: 'add',
  shape: 'box',
  size: [100, 100, 40],
} as const

const renderer = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  pick: vi.fn<() => string | undefined>(),
  render: vi.fn(),
  resize: vi.fn(),
}))

vi.mock('../spatial-mesh-preview-renderer', () => ({
  createSpatialMeshPreviewRenderer: renderer.create,
}))

beforeEach(() => {
  renderer.create.mockReturnValue(renderer)
  renderer.pick.mockReturnValue(undefined)
  renderer.render.mockReturnValue(undefined)
})

afterEach(() => vi.clearAllMocks())

test('should render the 3D mesh on a Three.js canvas and orbit by pointer drag', () => {
  const view = render(() => <SpatialMeshPreview isOpen operations={[operation]} />)
  const preview = view.getByRole('group', {name: '3D 메시 회전 미리보기'})
  expect(preview.tagName).toBe('CANVAS')
  expect(view.container.querySelector('svg')).toBeNull()
  expect(renderer.create).toHaveBeenCalledWith(preview)
  expect(renderer.render).toHaveBeenCalledWith(
    expect.objectContaining({orbit: {pitch: -25, yaw: 35}}),
  )

  const pointer = (type: string, clientX: number, clientY: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY})
    Object.defineProperty(event, 'pointerId', {value: 7})
    return event
  }
  fireEvent(preview, pointer('pointerdown', 10, 10))
  fireEvent(preview, pointer('pointermove', 90, 40))
  fireEvent(preview, pointer('pointerup', 90, 40))
  expect(renderer.render).toHaveBeenLastCalledWith(
    expect.objectContaining({orbit: {pitch: -10, yaw: 75}}),
  )

  fireEvent.click(view.getByRole('button', {name: '시점 초기화'}))
  expect(renderer.render).toHaveBeenLastCalledWith(
    expect.objectContaining({orbit: {pitch: -25, yaw: 35}}),
  )
  view.unmount()
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

test('should pass target parts to the preview before a mesh exists', () => {
  const part = {
    id: 'target',
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 100, 0, 0, 100]},
    texture: {height: 100, src: 'data:image/png;base64,', width: 100},
  }
  render(() => <SpatialMeshPreview isOpen objects={[]} referenceParts={[part]} />)
  expect(renderer.render).toHaveBeenCalledWith(
    expect.objectContaining({mesh: undefined, referenceParts: [part]}),
  )
})

test('should place the preview mesh at the deformer mesh position', () => {
  const original = render(() => <SpatialMeshPreview isOpen operations={[operation]} />)
  const source = renderer.render.mock.lastCall?.[0].mesh.vertices as ReadonlyArray<number>
  original.unmount()

  const moved = render(() => (
    <SpatialMeshPreview isOpen operations={[operation]} meshPosition={[10, 20, 5]} />
  ))
  const placed = renderer.render.mock.lastCall?.[0].mesh.vertices as ReadonlyArray<number>
  expect(placed.map((value, index) => value - source[index]!)).toEqual(
    source.map((_, index) => [10, 20, 5][index % 3]),
  )
  moved.unmount()
})

const projectedGizmo = {
  center: {x: 80, y: 90},
  handles: [
    {axis: 'x', end: {x: 144, y: 90}, movePath: 'M 80 90 L 144 90', rotatePath: 'M 80 42 L 80 138'},
    {axis: 'y', end: {x: 80, y: 154}, movePath: 'M 80 90 L 80 154', rotatePath: 'M 32 90 L 128 90'},
    {
      axis: 'z',
      end: {x: 120, y: 70},
      movePath: 'M 80 90 L 120 70',
      rotatePath: 'M 48 58 L 112 122',
    },
  ],
  height: 200,
  width: 200,
  worldLength: 20,
} as const

const pointer = (type: string, clientX: number, clientY: number) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY})
  Object.defineProperty(event, 'pointerId', {value: 7})
  return event
}

test('should place a projected XYZ gizmo at the selected shape center', () => {
  renderer.render.mockReturnValue(projectedGizmo)
  const object = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      meshPosition={[10, 20, 5]}
      objects={[object]}
      selectedIds={['body']}
      tool="move"
    />
  ))

  expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({pivot: [60, 70, 5]}))
  const marker = view.getByRole('group', {name: '선택한 도형의 3D 변형 축'})
  expect(marker.getAttribute('viewBox')).toBe('0 0 200 200')
  expect(marker.querySelector('circle')?.getAttribute('cx')).toBe('80')
  expect(marker.querySelector('circle')?.getAttribute('cy')).toBe('90')
  expect(view.getByRole('button', {name: 'X축 이동'})).toBeTruthy()
  expect(view.getByRole('button', {name: 'Y축 이동'})).toBeTruthy()
  expect(view.getByRole('button', {name: 'Z축 이동'})).toBeTruthy()
})

test('should move only the grabbed axis from its projected direction', () => {
  renderer.render.mockReturnValue(projectedGizmo)
  const onTransform = vi.fn()
  const object = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      objects={[object]}
      selectedIds={['body']}
      tool="move"
      onTransform={onTransform}
    />
  ))
  const axis = view.getByRole('button', {name: 'X축 이동'})
  fireEvent(axis, pointer('pointerdown', 100, 90))
  fireEvent(axis, pointer('pointermove', 132, 100))
  fireEvent(axis, pointer('pointerup', 132, 100))
  expect(onTransform).toHaveBeenCalledWith('body', {center: [60, 50, 0]})
})

test('should rotate only the grabbed axis around the projected center', () => {
  renderer.render.mockReturnValue(projectedGizmo)
  const onTransform = vi.fn()
  const object = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      objects={[object]}
      selectedIds={['body']}
      tool="rotate"
      onTransform={onTransform}
    />
  ))
  const axis = view.getByRole('button', {name: 'Y축 회전'})
  fireEvent(axis, pointer('pointerdown', 100, 90))
  fireEvent(axis, pointer('pointermove', 80, 110))
  fireEvent(axis, pointer('pointerup', 80, 110))
  expect(onTransform).toHaveBeenCalledWith('body', {rotation: [0, 90, 0]})
})

test('should nudge a focused axis from the keyboard', () => {
  renderer.render.mockReturnValue(projectedGizmo)
  const onTransform = vi.fn()
  const object = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      objects={[object]}
      selectedIds={['body']}
      tool="rotate"
      onTransform={onTransform}
    />
  ))
  fireEvent.keyDown(view.getByRole('button', {name: 'Z축 회전'}), {key: 'ArrowRight'})
  expect(onTransform).toHaveBeenCalledWith('body', {rotation: [0, 0, 15]})
})

test('should rotate with keyboard and keep focusable instructions', () => {
  const view = render(() => <SpatialMeshPreview isOpen operations={[operation]} />)
  const preview = view.getByRole('group', {name: '3D 메시 회전 미리보기'})
  fireEvent.keyDown(preview, {key: 'ArrowRight'})
  expect(renderer.render).toHaveBeenLastCalledWith(
    expect.objectContaining({orbit: {pitch: -25, yaw: 50}}),
  )
  fireEvent.keyDown(preview, {key: 'Home'})
  expect(renderer.render).toHaveBeenLastCalledWith(
    expect.objectContaining({orbit: {pitch: -25, yaw: 35}}),
  )
})

test('should emit a shape rotation when dragging with the rotate tool', () => {
  const onTransform = vi.fn()
  const object = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      objects={[object]}
      selectedIds={['body']}
      tool="rotate"
      onTransform={onTransform}
    />
  ))
  const preview = view.getByRole('group', {name: '3D 메시 회전 미리보기'})
  renderer.pick.mockReturnValue('body')
  const pointer = (type: string, clientX: number, clientY: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY})
    Object.defineProperty(event, 'pointerId', {value: 3})
    return event
  }
  fireEvent(preview, pointer('pointerdown', 0, 0))
  fireEvent(preview, pointer('pointermove', 40, 20))
  fireEvent(preview, pointer('pointerup', 40, 20))
  expect(onTransform).toHaveBeenCalledWith('body', {rotation: [10, 20, 0]})
})

test('should keep an editable child selected while dragging its merged surface', () => {
  const onTransform = vi.fn()
  const onSelect = vi.fn()
  const box = {
    ...operation,
    kind: 'primitive',
    name: '네모',
    rotation: [0, 0, 0],
    visible: true,
  } as const
  const sphere = {
    ...box,
    center: [65, 50, 0] as const,
    id: 'sphere',
    name: '동그라미',
    shape: 'sphere' as const,
  }
  const group = {
    children: [box, sphere],
    id: 'group',
    kind: 'group',
    mode: 'add',
    name: '합친 메시',
    visible: true,
  } as const
  const view = render(() => (
    <SpatialMeshPreview
      isOpen
      objects={[group]}
      selectedIds={['body']}
      tool="rotate"
      onSelect={onSelect}
      onTransform={onTransform}
    />
  ))
  const preview = view.getByRole('group', {name: '3D 메시 회전 미리보기'})
  renderer.pick.mockReturnValue('group')
  const pointer = (type: string, clientX: number, clientY: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY})
    Object.defineProperty(event, 'pointerId', {value: 4})
    return event
  }
  fireEvent(preview, pointer('pointerdown', 0, 0))
  fireEvent(preview, pointer('pointermove', 40, 0))
  fireEvent(preview, pointer('pointerup', 40, 0))
  expect(onTransform).toHaveBeenCalledWith('body', {rotation: [0, 20, 0]})
  expect(onSelect).not.toHaveBeenCalled()
})
