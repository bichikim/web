/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'

import type {PuppetPart} from '../../../player'
import {createSpatialEditorObject} from '../spatial-editor-objects'
import {SpatialMeshDialog} from '../SpatialMeshDialog'

const imported = vi.hoisted(() => ({parse: vi.fn()}))

const findButton = (buttons: ReadonlyArray<HTMLElement>, name: string) => {
  const matchingButtons = buttons.filter(
    (button) => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === name,
  )
  expect(matchingButtons.length).toBeLessThanOrEqual(1)
  return matchingButtons[0]
}

vi.mock('../../../deformation/import-spatial-mesh', () => ({importSpatialMesh: imported.parse}))

vi.mock('../SpatialMeshPreview', () => ({
  SpatialMeshPreview: () => <canvas aria-label="3D 메시 회전 미리보기" role="group" />,
}))

vi.mock('../spatial-mesh-preview-renderer', () => ({
  createSpatialMeshPreviewRenderer: () => ({
    destroy: () => undefined,
    pick: () => undefined,
    render: () => undefined,
    resize: () => undefined,
  }),
}))

test('should mount the mesh preview canvas when a shape is added', () => {
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

  const dialog = view.container.ownerDocument.body.querySelector('[role="dialog"]')!
  expect(dialog).toBeVisible()
  const initialButtons = Array.from(dialog.querySelectorAll('button'))
  expect(findButton(initialButtons, '대상에 네모 맞추기')).toBeUndefined()
  const addBox = findButton(initialButtons, '박스 추가')
  expect(addBox).toBeDefined()
  expect(addBox).toBeVisible()
  expect(addBox).toHaveAccessibleName('박스 추가')
  fireEvent.click(addBox!)

  const spinbuttons = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="number"]'))
  const field = (name: string) => {
    const matchingFields = spinbuttons.filter(
      (spinbutton) => spinbutton.getAttribute('aria-label') === name,
    )
    expect(matchingFields).toHaveLength(1)
    const matchingField = matchingFields[0]!
    expect(matchingField).toBeVisible()
    expect(matchingField).toHaveAccessibleName(name)
    return matchingField
  }
  const centerX = field('center X')
  expect(centerX).toHaveValue(0)
  expect(field('center Y')).toHaveValue(0)
  expect(field('center Z')).toHaveValue(0)
  expect(field('size X')).toHaveValue(200)
  expect(field('size Y')).toHaveValue(100)

  fireEvent.focus(centerX)
  fireEvent.input(centerX, {target: {value: '20'}})
  fireEvent.blur(centerX)
  expect(centerX).toHaveValue(20)

  const selectedButtons = Array.from(dialog.querySelectorAll('button'))
  const fitToTarget = findButton(selectedButtons, '대상 크기에 맞추기')
  const apply = findButton(selectedButtons, '메시 적용')
  expect(fitToTarget).toBeDefined()
  expect(apply).toBeDefined()
  expect(fitToTarget).toBeVisible()
  expect(apply).toBeVisible()
  expect(fitToTarget).toHaveAccessibleName('대상 크기에 맞추기')
  expect(apply).toHaveAccessibleName('메시 적용')
  fireEvent.click(fitToTarget!)
  expect(centerX).toHaveValue(0)

  fireEvent.click(apply!)
  expect(onApply).toHaveBeenCalledWith([
    expect.objectContaining({center: [210, 135, -7], size: [200, 100, 100 / 3]}),
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
