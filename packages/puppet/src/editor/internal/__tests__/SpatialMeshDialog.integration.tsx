/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

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

test('should import a GLB into the workspace for transforms and composition', async () => {
  imported.parse.mockReturnValue({
    indices: [0, 1, 2],
    source: {kind: 'imported', name: 'sample.glb'},
    vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0],
  })
  const onApply = vi.fn(() => true)
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      isOpen
      onApply={onApply}
      onOpenChange={vi.fn()}
    />
  ))
  const file = new File(['mesh'], 'sample.glb', {type: 'model/gltf-binary'})
  Object.defineProperty(file, 'arrayBuffer', {value: vi.fn().mockResolvedValue(new ArrayBuffer(0))})
  fireEvent.change(screen.getByLabelText('GLB 메시 가져오기'), {target: {files: [file]}})

  expect(await screen.findByRole('button', {name: 'sample.glb 편집'})).toBeInTheDocument()
  expect(screen.getByRole('spinbutton', {name: 'rotation X'})).toBeInTheDocument()
  expect(screen.queryByRole('combobox', {name: '도형 종류'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
  fireEvent.click(screen.getByRole('button', {name: '전체 선택'}))
  fireEvent.click(screen.getByRole('button', {name: '더하기로 합성'}))
  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))

  expect(onApply).toHaveBeenCalledWith([
    expect.objectContaining({
      children: [
        expect.objectContaining({kind: 'mesh', name: 'sample.glb'}),
        expect.objectContaining({kind: 'primitive', shape: 'box'}),
      ],
      kind: 'group',
    }),
  ])
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
