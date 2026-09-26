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
