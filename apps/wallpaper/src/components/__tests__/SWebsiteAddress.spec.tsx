/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SWebsiteAddress} from '../SWebsiteAddress'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
})
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)
const history = [
  {url: 'https://bruno-simon.com/', visitedAt: 2},
  {url: 'https://example.org/', visitedAt: 1},
]

it('should open history on focus and apply a selected address without committing the unfinished draft', () => {
  const onChange = vi.fn()
  render(() => <SWebsiteAddress history={history} onChange={onChange} />)
  const input = screen.getByRole('combobox', {name: '웹사이트 주소'})
  expect(input).toHaveAttribute('aria-expanded', 'false')
  input.focus()
  expect(screen.getByRole('dialog', {name: '방문 내역'})).toBeInTheDocument()
  fireEvent.input(input, {target: {value: 'unfinished'}})
  const choice = screen.getByRole('button', {name: 'https://bruno-simon.com/'})
  choice.focus()
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.click(choice)
  expect(onChange).toHaveBeenCalledExactlyOnceWith('https://bruno-simon.com/')
  expect(input).toHaveValue('https://bruno-simon.com/')
  expect(input).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('should enter history with ArrowDown and cancel a draft with Escape without navigating', () => {
  const onChange = vi.fn()
  render(() => (
    <SWebsiteAddress value="https://original.test/" history={history} onChange={onChange} />
  ))
  const input = screen.getByRole('combobox', {name: '웹사이트 주소'})
  input.focus()
  fireEvent.input(input, {target: {value: 'draft'}})
  fireEvent.keyDown(input, {key: 'ArrowDown'})
  expect(screen.getByRole('button', {name: 'https://bruno-simon.com/'})).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, {key: 'Escape'})
  expect(input).toHaveValue('https://original.test/')
  expect(input).toHaveFocus()
  expect(input).toHaveAttribute('aria-expanded', 'false')
  expect(onChange).not.toHaveBeenCalled()
})

it('should commit typed addresses once on Enter or leaving the field and ignore composing Enter', () => {
  const onChange = vi.fn()
  render(() => (
    <>
      <SWebsiteAddress history={history} onChange={onChange} />
      <button>바깥</button>
    </>
  ))
  const input = screen.getByRole('combobox', {name: '웹사이트 주소'})
  input.focus()
  fireEvent.input(input, {target: {value: 'https://new.test/'}})
  fireEvent.keyDown(input, {isComposing: true, key: 'Enter'})
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(input, {key: 'Enter'})
  screen.getByRole('button', {name: '바깥'}).focus()
  expect(onChange).toHaveBeenCalledExactlyOnceWith('https://new.test/')
  input.focus()
  fireEvent.input(input, {target: {value: 'https://other.test/'}})
  screen.getByRole('button', {name: '바깥'}).focus()
  expect(onChange).toHaveBeenLastCalledWith('https://other.test/')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('should remove history entries without applying them and close when no entries remain', async () => {
  const [entries, setEntries] = createSignal(history)
  const onChange = vi.fn()
  const remove = async (url: string) => {
    setEntries((items) => items.filter((item) => item.url !== url))
  }
  render(() => <SWebsiteAddress history={entries()} onChange={onChange} onRemove={remove} />)
  const input = screen.getByRole('combobox', {name: '웹사이트 주소'})
  input.focus()
  fireEvent.click(screen.getByRole('button', {name: 'https://bruno-simon.com/ 내역 삭제'}))
  await Promise.resolve()
  expect(screen.queryByRole('button', {name: 'https://bruno-simon.com/'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'https://example.org/ 내역 삭제'}))
  await Promise.resolve()
  expect(input).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', {name: '방문 내역'})).toBeNull()
  expect(onChange).not.toHaveBeenCalled()
})

it('should toggle history using its button and accept native dismissal without applying an address', () => {
  const onChange = vi.fn()
  render(() => <SWebsiteAddress history={history} onChange={onChange} />)
  const toggle = screen.getByRole('button', {name: '방문 내역'})
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(toggle)
  const event = new Event('beforetoggle')
  Object.defineProperty(event, 'newState', {value: 'closed'})
  fireEvent(screen.getByRole('dialog'), event)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onChange).not.toHaveBeenCalled()
})
