/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {createSpatialEditorObject} from '../spatial-editor-objects'
import {SpatialMeshDialog} from '../SpatialMeshDialog'

vi.mock('../spatial-mesh-preview-renderer', () => ({
  createSpatialMeshPreviewRenderer: () => ({
    destroy: () => undefined,
    pick: () => undefined,
    render: () => undefined,
    resize: () => undefined,
  }),
}))

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

test('should show the Three.js mesh preview canvas', () => {
  const view = render(() => (
    <SpatialMeshDialog
      bounds={{height: 100, width: 100, x: 0, y: 0}}
      isOpen
      onApply={() => true}
      onOpenChange={vi.fn()}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '네모 추가'}))
  const preview = screen.getByRole('group', {name: '3D 메시 회전 미리보기'})
  expect(preview.tagName).toBe('CANVAS')
  expect(screen.queryByRole('group', {name: '미리보기 방식'})).toBeNull()
  view.unmount()
})
