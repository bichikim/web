/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {EditorParameterItem} from '../EditorParameterItem'

const renderItem = (onDelete = vi.fn(), onNameChange = vi.fn()) => {
  const onSelect = vi.fn()
  const view = render(() => (
    <EditorParameterItem
      keyformCount={3}
      maximum={30}
      minimum={-30}
      name="Angle X"
      value={0}
      onDelete={onDelete}
      onNameChange={onNameChange}
      onSelect={onSelect}
    />
  ))

  return {
    item: view.getByRole('button', {name: 'Angle X'}),
    onDelete,
    onNameChange,
    onSelect,
    view,
  }
}

test('should edit its single visible name after a double click', () => {
  const {item, onNameChange, view} = renderItem()

  expect(view.getByText('-30 · 0 · 30 · 3 keyforms')).toBeVisible()
  fireEvent.click(item, {timeStamp: 100})
  fireEvent.click(item, {timeStamp: 200})
  const nameInput = view.getByRole('textbox', {name: 'Parameter 이름'})
  expect(nameInput).toHaveFocus()

  fireEvent.input(nameInput, {target: {value: 'Face Angle'}})
  fireEvent.keyDown(nameInput, {key: 'Enter'})

  expect(onNameChange).toHaveBeenCalledWith('Face Angle')
  expect(view.queryByRole('textbox', {name: 'Parameter 이름'})).not.toBeInTheDocument()
})

test('should return to its origin when released before the delete threshold', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  window.dispatchEvent(new MouseEvent('pointermove', {clientX: 150}))
  expect(view.getByText('삭제')).toBeVisible()
  expect(onDelete).not.toHaveBeenCalled()

  window.dispatchEvent(new MouseEvent('pointerup'))
  expect(view.container.querySelector('.parameter-swipe-row')?.getAttribute('style')).toContain(
    '--parameter-swipe-offset: 0px',
  )
  expect(onDelete).not.toHaveBeenCalled()
})

test('should delete only after it is dragged beyond the threshold and released', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  window.dispatchEvent(new MouseEvent('pointermove', {clientX: 120}))
  expect(view.getByText('놓아 삭제')).toBeVisible()
  expect(onDelete).not.toHaveBeenCalled()

  window.dispatchEvent(new MouseEvent('pointerup'))
  expect(onDelete).toHaveBeenCalledOnce()
})

test('should provide a two-step Delete key alternative', () => {
  const {item, onDelete} = renderItem()

  fireEvent.keyDown(item, {key: 'Delete'})
  expect(onDelete).not.toHaveBeenCalled()
  fireEvent.keyDown(item, {key: 'Delete'})
  expect(onDelete).toHaveBeenCalledOnce()
})
