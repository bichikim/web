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

test('should expose an editor workspace without the introductory heading and description', () => {
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      isOpen
      onApply={() => true}
      onOpenChange={vi.fn()}
    />
  ))

  expect(screen.getByRole('dialog', {name: '메시 편집'})).toBeTruthy()
  expect(screen.queryByText('3D 변형 메시 만들기')).toBeNull()
  expect(
    screen.queryByText('도형을 따로 배치하고 선택한 도형만 합쳐 이미지 변형용 메시를 만듭니다.'),
  ).toBeNull()
  expect(screen.getByRole('group', {name: '도형 추가'})).toBeTruthy()
  expect(screen.getByRole('group', {name: '편집 도구'})).toBeTruthy()
  expect(screen.getByRole('region', {name: '객체 목록'})).toBeTruthy()
  expect(screen.getByRole('region', {name: '선택 속성'})).toBeTruthy()
  view.unmount()
})

test('fits a box to linked part vertices and displays its center as 0, 0, 0', () => {
  const part = {
    mesh: {vertices: [120, 80, 220, 80, 220, 180, 120, 180]},
  } as unknown as PuppetPart
  const hiddenPart = {
    mesh: {vertices: [220, 80, 320, 80, 320, 180, 220, 180]},
  } as unknown as PuppetPart
  const onApply = vi.fn(() => true)
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

  expect(screen.queryByRole('button', {name: '대상에 네모 맞추기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
  expect(screen.getByRole('spinbutton', {name: 'center X'})).toHaveValue(0)
  expect(screen.getByRole('spinbutton', {name: 'center Y'})).toHaveValue(0)
  expect(screen.getByRole('spinbutton', {name: 'center Z'})).toHaveValue(0)
  expect(screen.getByRole('spinbutton', {name: 'size X'})).toHaveValue(200)
  expect(screen.getByRole('spinbutton', {name: 'size Y'})).toHaveValue(100)

  const x = screen.getByRole('spinbutton', {name: 'center X'})
  fireEvent.focus(x)
  fireEvent.input(x, {target: {value: '20'}})
  fireEvent.blur(x)
  expect(x).toHaveValue(20)
  fireEvent.click(screen.getByRole('button', {name: '대상 크기에 맞추기'}))
  expect(x).toHaveValue(0)

  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))
  expect(onApply).toHaveBeenCalledWith([
    expect.objectContaining({center: [210, 135, -7], size: [200, 100, 100 / 3]}),
  ])
  view.unmount()
})

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

test('should reopen an existing imported mesh as an editable object', () => {
  const onApply = vi.fn(() => true)
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      initialMesh={{
        indices: [0, 1, 2],
        source: {kind: 'imported', name: 'existing.glb'},
        vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0],
      }}
      isOpen
      onApply={onApply}
      onOpenChange={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: 'existing.glb 편집'}))
  expect(screen.getByRole('spinbutton', {name: 'size X'})).toHaveValue(2)
  fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))
  expect(onApply).toHaveBeenCalledWith([
    expect.objectContaining({kind: 'mesh', name: 'existing.glb'}),
  ])
  view.unmount()
})
