/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, onCleanup} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {KeyedList} from '..'

afterEach(cleanup)

it('should preserve row state by key while updating values and ordering', () => {
  const [items, setItems] = createSignal([
    {id: 'a', text: 'Apple'},
    {id: 'b', text: 'Pear'},
  ])
  render(() => (
    <ul>
      <KeyedList each={items()} by={(item) => item.id}>
        {(item, index) => {
          const [draft, setDraft] = createSignal('')
          return (
            <li>
              <span>
                {index()}: {item().text}
              </span>
              <input
                aria-label={item().id}
                value={draft()}
                onInput={(event) => setDraft(event.currentTarget.value)}
              />
            </li>
          )
        }}
      </KeyedList>
    </ul>
  ))
  const first = screen.getByRole('textbox', {name: 'a'})
  const second = screen.getByRole('textbox', {name: 'b'})
  fireEvent.input(first, {target: {value: 'unsaved'}})
  first.focus()
  setItems([
    {id: 'b', text: 'Updated pear'},
    {id: 'a', text: 'Updated apple'},
  ])
  expect(screen.getAllByRole('textbox')[0]).toBe(second)
  expect(screen.getAllByRole('textbox')[1]).toBe(first)
  expect(first).toHaveValue('unsaved')
  expect(screen.getByText('0: Updated pear')).toBeVisible()
  expect(screen.getByText('1: Updated apple')).toBeVisible()
  first.focus()
  setItems([
    {id: 'b', text: 'Newest pear'},
    {id: 'a', text: 'Final apple'},
  ])
  expect(first).toHaveFocus()
})

it('should dispose removed rows and start new state when an identity is reintroduced', () => {
  const [items, setItems] = createSignal([
    {id: 'a', text: 'Apple'},
    {id: 'b', text: 'Pear'},
  ])
  const dispose = vi.fn()
  render(() => (
    <KeyedList each={items()} by={(item) => item.id}>
      {(item) => {
        const id = item().id
        onCleanup(() => dispose(id, item().text))
        return <button>{item().text}</button>
      }}
    </KeyedList>
  ))
  const first = screen.getByRole('button', {name: 'Apple'})
  const second = screen.getByRole('button', {name: 'Pear'})
  setItems([{id: 'b', text: 'Updated pear'}])
  expect(first).not.toBeInTheDocument()
  expect(dispose).toHaveBeenCalledExactlyOnceWith('a', 'Apple')
  expect(screen.getByRole('button', {name: 'Updated pear'})).toBe(second)
  setItems([
    {id: 'a', text: 'Apple'},
    {id: 'b', text: 'Final pear'},
  ])
  expect(screen.getByRole('button', {name: 'Apple'})).not.toBe(first)
  expect(screen.getByRole('button', {name: 'Final pear'})).toBe(second)
  setItems([])
  expect(screen.queryAllByRole('button')).toEqual([])
  expect(dispose.mock.calls).toEqual([
    ['a', 'Apple'],
    ['a', 'Apple'],
    ['b', 'Final pear'],
  ])
})
