/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'

import type {PuppetPart} from '../../../player'
import {createSpatialEditorObject} from '../spatial-editor-objects'
import {SpatialMeshDialog} from '../SpatialMeshDialog'

const imported = vi.hoisted(() => ({parse: vi.fn()}))

vi.mock('../../../deformation/import-spatial-mesh', () => ({importSpatialMesh: imported.parse}))

vi.mock('../spatial-mesh-preview-renderer', () => ({
  createSpatialMeshPreviewRenderer: () => ({
    destroy: () => undefined,
    pick: () => undefined,
    render: () => undefined,
    resize: () => undefined,
  }),
}))

afterEach(() => vi.restoreAllMocks())

test('should show the Three.js mesh preview canvas', () => {
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      isOpen
      onApply={() => true}
      onOpenChange={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
  const preview = screen.getByRole('group', {name: '3D 메시 회전 미리보기'})
  expect(preview.tagName).toBe('CANVAS')
  expect(screen.queryByRole('group', {name: '미리보기 방식'})).toBeNull()
  view.unmount()
})

test('should edit mesh coordinates with the shared number field and undo a continuous edit once', () => {
  const bounds = {height: 100, width: 100, x: 0, y: 0}
  const object = createSpatialEditorObject(bounds, 'box')
  const onApply = vi.fn(() => true)
  const view = render(() => (
    <SpatialMeshDialog
      bounds={bounds}
      initialObjects={[object]}
      isOpen
      onApply={onApply}
      onOpenChange={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: `${object.name} 편집`}))
  const position = screen.getByRole('spinbutton', {name: 'center X'})
  expect(screen.getByRole('button', {name: 'center X 증가'})).toBeEnabled()

  fireEvent.focus(position)
  fireEvent.input(position, {target: {value: '60'}})
  fireEvent.input(position, {target: {value: '61'}})
  fireEvent.blur(position)
  expect(position).toHaveValue(61)

  fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))
  expect(onApply).toHaveBeenCalledWith([{...object, center: [50, 50, 0]}])
  view.unmount()
})

test('should add a box, edit its center, fit it to linked parts, and apply the exact object', () => {
  const part = {
    mesh: {vertices: [120, 80, 220, 80, 220, 180, 120, 180]},
  } as unknown as PuppetPart
  const hiddenPart = {
    mesh: {vertices: [220, 80, 320, 80, 320, 180, 220, 180]},
  } as unknown as PuppetPart
  const id = '00000000-0000-4000-8000-000000000270'
  const onApply = vi.fn(() => true)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(id)
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 40, width: 40, x: 0, y: 0}}
      meshPosition={[10, -5, 7]}
      referenceParts={[part]}
      targetParts={[part, hiddenPart]}
      isOpen
      onApply={onApply}
      onOpenChange={vi.fn()}
    />
  ))

  expect(screen.getByRole('group', {name: '3D 메시 회전 미리보기'}).tagName).toBe('CANVAS')
  fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))

  const centerX = screen.getByRole('spinbutton', {name: 'center X'})
  expect(centerX).toHaveValue(0)
  fireEvent.focus(centerX)
  fireEvent.input(centerX, {target: {value: '20'}})
  fireEvent.blur(centerX)
  expect(centerX).toHaveValue(20)

  fireEvent.click(screen.getByRole('button', {name: '대상 크기에 맞추기'}))
  expect(centerX).toHaveValue(0)
  expect(screen.getByRole('spinbutton', {name: 'size X'})).toHaveValue(200)
  expect(screen.getByRole('spinbutton', {name: 'size Y'})).toHaveValue(100)
  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))

  expect(onApply).toHaveBeenCalledTimes(1)
  expect(onApply).toHaveBeenCalledWith([
    {
      center: [210, 135, -7],
      id,
      kind: 'primitive',
      mode: 'add',
      name: '박스',
      rotation: [0, 0, 0],
      shape: 'box',
      size: [200, 100, 100 / 3],
      visible: true,
    },
  ])
  view.unmount()
})

test('fits the selected sphere without adding a box and preserves subtraction order', () => {
  const onApply = vi.fn(() => true)
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      isOpen
      onApply={onApply}
      onOpenChange={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
  fireEvent.click(screen.getByRole('button', {name: '구체 추가'}))
  expect(screen.getByRole('spinbutton', {name: 'size X'})).toHaveValue(50)
  fireEvent.click(screen.getByRole('button', {name: '대상 크기에 맞추기'}))
  expect(screen.getByRole('spinbutton', {name: 'size X'})).toHaveValue(100)
  expect(screen.getByRole('spinbutton', {name: 'size Y'})).toHaveValue(100)
  expect(screen.getByRole('spinbutton', {name: 'center X'})).toHaveValue(0)
  expect(screen.queryByRole('button', {name: '대상에 네모 맞추기'})).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: '전체 선택'}))
  fireEvent.click(screen.getByRole('radio', {name: '빼기'}))
  expect(screen.getByText('기준: 박스 · 뺄 객체 1개')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '빼기로 합성'}))
  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))
  expect(onApply).toHaveBeenCalledWith([
    expect.objectContaining({
      children: [
        expect.objectContaining({mode: 'add', shape: 'box'}),
        expect.objectContaining({mode: 'subtract', shape: 'sphere'}),
      ],
    }),
  ])
  view.unmount()
})
