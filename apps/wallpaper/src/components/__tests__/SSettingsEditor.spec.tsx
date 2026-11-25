/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SSettingsEditor} from '../SSettingsEditor'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)
const options = Array.from({length: 8}, (_, index) => ({label: `항목 ${index}`, value: `${index}`}))

it('should replace the list with a switchable detail and restore its search and focus on return', () => {
  render(() => (
    <SSettingsEditor label="행동 연결" options={options}>
      {(id) => <input aria-label="상세 내용" value={id} readOnly />}
    </SSettingsEditor>
  ))
  const search = screen.getByRole('searchbox', {name: '행동 연결 목록 검색'})
  fireEvent.input(search, {target: {value: '항목'}})
  const origin = screen.getByRole('button', {name: '항목 2 편집'})
  fireEvent.click(origin)
  expect(screen.queryByRole('searchbox')).toBeNull()
  expect(screen.getByRole('textbox', {name: '상세 내용'})).toHaveValue('2')
  fireEvent.click(screen.getByRole('combobox', {name: '행동 연결 선택'}))
  fireEvent.click(screen.getByRole('option', {name: '항목 6'}))
  expect(screen.getByRole('textbox', {name: '상세 내용'})).toHaveValue('6')
  fireEvent.click(screen.getByRole('button', {name: '행동 연결 목록으로'}))
  expect(screen.getByRole('searchbox', {name: '행동 연결 목록 검색'})).toBe(search)
  expect(search).toHaveValue('항목')
  expect(screen.getByRole('button', {name: '항목 6 편집'})).toHaveAttribute('aria-pressed', 'true')
  expect(origin).toHaveFocus()
  expect(screen.queryByRole('textbox', {name: '상세 내용'})).toBeNull()
})

it('should return to the list if the item being edited is removed', () => {
  const [items, setItems] = createSignal(options)
  const select = vi.fn()
  render(() => (
    <SSettingsEditor label="연결" options={items()} onSelect={select}>
      {(id) => <input aria-label="상세 내용" value={id} readOnly />}
    </SSettingsEditor>
  ))
  fireEvent.click(screen.getByRole('button', {name: '항목 2 편집'}))
  setItems((previous) => previous.filter((item) => item.value !== '2'))
  expect(screen.queryByRole('textbox', {name: '상세 내용'})).toBeNull()
  expect(screen.getByRole('region', {name: '연결 목록'})).toBeVisible()
  expect(select).toHaveBeenLastCalledWith(null)
})

it('should open a newly created item from the list actions', () => {
  const [items, setItems] = createSignal<typeof options>([])
  const actions = (edit: (id: string) => void): JSX.Element => {
    const handleAdd = () => {
      setItems([{label: '새 연결', value: 'new'}])
      edit('new')
    }
    return (
      <button type="button" onClick={handleAdd}>
        연결 추가
      </button>
    )
  }
  render(() => (
    <SSettingsEditor label="연결" options={items()} actions={actions}>
      {(id) => <input aria-label="상세 내용" value={id} readOnly />}
    </SSettingsEditor>
  ))
  fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
  expect(screen.getByRole('textbox', {name: '상세 내용'})).toHaveValue('new')
  expect(screen.queryByRole('button', {name: '연결 추가'})).toBeNull()
})
