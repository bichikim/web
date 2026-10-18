/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {EditorNumberField, EditorSelect} from '../../../design-system'
import {EditorParameterItem} from '../EditorParameterItem'

const renderItem = (onDelete = vi.fn(), onNameChange = vi.fn()) => {
  const onSelect = vi.fn()
  const view = render(() => (
    <EditorParameterItem
      name="Angle X"
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

  expect(view.queryByText(/keyforms/)).not.toBeInTheDocument()
  fireEvent.click(item, {timeStamp: 100})
  fireEvent.click(item, {timeStamp: 200})
  const nameInput = view.getByRole('textbox', {name: 'Parameter 이름'})
  expect(nameInput).toHaveFocus()

  fireEvent.input(nameInput, {target: {value: 'Face Angle'}})
  fireEvent.keyDown(nameInput, {key: 'Enter'})

  expect(onNameChange).toHaveBeenCalledWith('Face Angle')
  expect(view.queryByRole('textbox', {name: 'Parameter 이름'})).not.toBeInTheDocument()
})

test('should edit the independently selected name of a two-dimensional parameter', () => {
  const onNameChange = vi.fn()
  const onSecondaryNameChange = vi.fn()
  const view = render(() => (
    <EditorParameterItem
      name="Angle X"
      secondaryName="Angle Y"
      onNameChange={onNameChange}
      onSecondaryNameChange={onSecondaryNameChange}
    />
  ))

  fireEvent.dblClick(view.getByRole('button', {name: 'Angle Y'}))
  const nameInput = view.getByRole('textbox', {name: 'Parameter 이름'})
  expect(nameInput).toHaveValue('Angle Y')

  fireEvent.input(nameInput, {target: {value: 'Head Y'}})
  fireEvent.keyDown(nameInput, {key: 'Enter'})

  expect(onNameChange).not.toHaveBeenCalled()
  expect(onSecondaryNameChange).toHaveBeenCalledWith('Head Y')
})

test('should return to its origin when released before the delete threshold', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 250}))
  expect(view.getByText('삭제')).toBeVisible()
  expect(onDelete).not.toHaveBeenCalled()

  globalThis.dispatchEvent(new MouseEvent('pointerup'))
  expect(view.container.querySelector('.parameter-swipe-row')?.getAttribute('style')).toContain(
    '--parameter-swipe-offset: 0px',
  )
  expect(onDelete).not.toHaveBeenCalled()
})

test('should delete only after it is dragged beyond the threshold and released', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
  expect(view.getByText('놓아 삭제')).toBeVisible()
  expect(onDelete).not.toHaveBeenCalled()

  globalThis.dispatchEvent(new MouseEvent('pointerup'))
  expect(onDelete).toHaveBeenCalledOnce()
})

test('should ignore a leftward swipe for deletion', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 120}))
  globalThis.dispatchEvent(new MouseEvent('pointerup'))

  expect(onDelete).not.toHaveBeenCalled()
  expect(view.container.querySelector('.parameter-swipe-row')?.getAttribute('style')).toContain(
    '--parameter-swipe-offset: 0px',
  )
})

test('should ignore movement from a different pointer during a swipe', () => {
  const {item, onDelete} = renderItem()
  const pointerEvent = (type: string, clientX: number, pointerId: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX})
    Object.defineProperty(event, 'pointerId', {value: pointerId})
    return event
  }

  item.dispatchEvent(pointerEvent('pointerdown', 200, 1))
  globalThis.dispatchEvent(pointerEvent('pointermove', 280, 2))
  globalThis.dispatchEvent(pointerEvent('pointerup', 280, 1))

  expect(onDelete).not.toHaveBeenCalled()
})

test('should keep the original pointer in control when another pointer starts on the row', () => {
  const {item, onDelete} = renderItem()
  const pointerEvent = (type: string, clientX: number, pointerId: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX})
    Object.defineProperty(event, 'pointerId', {value: pointerId})
    return event
  }

  item.dispatchEvent(pointerEvent('pointerdown', 200, 1))
  item.dispatchEvent(pointerEvent('pointerdown', 200, 2))
  globalThis.dispatchEvent(pointerEvent('pointermove', 280, 1))
  globalThis.dispatchEvent(pointerEvent('pointerup', 280, 1))

  expect(onDelete).toHaveBeenCalledOnce()
})

test('should cancel an armed swipe when the window loses focus', () => {
  const {item, onDelete, view} = renderItem()

  item.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
  globalThis.dispatchEvent(new Event('blur'))
  globalThis.dispatchEvent(new MouseEvent('pointerup'))

  expect(onDelete).not.toHaveBeenCalled()
  expect(view.container.querySelector('.parameter-swipe-row')?.getAttribute('style')).toContain(
    '--parameter-swipe-offset: 0px',
  )
})

test('should provide a two-step Delete key alternative', () => {
  const {item, onDelete} = renderItem()

  fireEvent.keyDown(item, {key: 'Delete'})
  expect(onDelete).not.toHaveBeenCalled()
  fireEvent.keyDown(item, {key: 'Delete'})
  expect(onDelete).toHaveBeenCalledOnce()
})

test('should suppress only the first footer click after a cancelled swipe', () => {
  const toggle = vi.fn()
  const view = render(() => (
    <EditorParameterItem
      name="Angle X"
      onDelete={vi.fn()}
      footer={<button onClick={toggle}>영향도</button>}
    />
  ))
  const footer = view.getByRole('button', {name: '영향도'})
  footer.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 220}))
  globalThis.dispatchEvent(new MouseEvent('pointerup'))
  fireEvent.click(footer)
  expect(toggle).not.toHaveBeenCalled()
  fireEvent.click(footer, {detail: 0})
  expect(toggle).toHaveBeenCalledOnce()
})

test.each(['surface', 'group', 'details'])(
  'should start swipe deletion from the %s area',
  (area) => {
    const onDelete = vi.fn()
    const view = render(() => (
      <EditorParameterItem name="Angle X" groupName="Head" onDelete={onDelete}>
        <span>Parameter value</span>
      </EditorParameterItem>
    ))
    // The empty row surface has no independent accessible control.
    const target =
      area === 'surface'
        ? view.container.querySelector('.parameter-item-surface')!
        : view.getByText(area === 'group' ? 'Head' : 'Parameter value')

    target.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
    expect(view.getByText('놓아 삭제')).toBeVisible()
    globalThis.dispatchEvent(new MouseEvent('pointerup'))
    expect(onDelete).toHaveBeenCalledOnce()
  },
)

test.each(['input', 'decrease', 'increase'])(
  'should exclude the numeric %s control from swipe deletion',
  (control) => {
    const onDelete = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorParameterItem name="Angle X" onDelete={onDelete}>
        <EditorNumberField label="Angle X 값" value={0} onValueChange={onValueChange} />
      </EditorParameterItem>
    ))
    const target =
      control === 'input'
        ? view.getByRole('spinbutton', {name: 'Angle X 값'})
        : view.getByRole('button', {name: `Angle X 값 ${control === 'decrease' ? '감소' : '증가'}`})

    target.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
    globalThis.dispatchEvent(new MouseEvent('pointerup'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(view.queryByText('놓아 삭제')).not.toBeInTheDocument()
    if (control === 'input') {
      expect(onValueChange).toHaveBeenCalled()
    } else {
      fireEvent.click(target)
      expect(onValueChange).toHaveBeenCalledWith(control === 'decrease' ? -1 : 1)
    }
  },
)

test('should exclude the name editing input from swipe deletion', () => {
  const {item, onDelete, view} = renderItem()
  fireEvent.dblClick(item)
  const input = view.getByRole('textbox', {name: 'Parameter 이름'})

  input.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
  globalThis.dispatchEvent(new MouseEvent('pointerup'))
  expect(onDelete).not.toHaveBeenCalled()
})

test('should exclude a discrete parameter value selector from swipe deletion', () => {
  const onDelete = vi.fn()
  const view = render(() => (
    <EditorParameterItem
      name="눈동자 무늬"
      onDelete={onDelete}
      primaryControl={
        <EditorSelect label="눈동자 무늬 값" options={['기본', '하트']} value="기본" />
      }
    />
  ))
  const value = view.getByRole('button', {name: '눈동자 무늬 값 기본'})

  value.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
  globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
  globalThis.dispatchEvent(new MouseEvent('pointerup'))

  expect(onDelete).not.toHaveBeenCalled()
  expect(view.queryByText('놓아 삭제')).not.toBeInTheDocument()
})
