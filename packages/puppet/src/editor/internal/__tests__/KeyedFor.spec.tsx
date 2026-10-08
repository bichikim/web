/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal, onCleanup} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {KeyedFor} from '../KeyedFor'

test('should retain keyed owners through updates and reorder, and dispose removed items', () => {
  const [items, setItems] = createSignal([
    {id: 'first', name: 'First'},
    {id: 'second', name: 'Second'},
  ])
  const cleanup = vi.fn()
  const view = render(() => (
    <ul>
      <KeyedFor each={items()} key={(item) => item.id}>
        {(item) => {
          onCleanup(() => cleanup(item().id))
          return (
            <li>
              <button>{item().name}</button>
            </li>
          )
        }}
      </KeyedFor>
    </ul>
  ))
  const first = view.getByRole('button', {name: 'First'})
  const second = view.getByRole('button', {name: 'Second'})
  first.focus()
  setItems([
    {id: 'first', name: 'Renamed'},
    {id: 'second', name: 'Second'},
  ])
  expect(view.getByRole('button', {name: 'Renamed'})).toBe(first)
  expect(first).toHaveFocus()
  setItems([
    {id: 'second', name: 'Second'},
    {id: 'first', name: 'Renamed'},
  ])
  expect(view.getAllByRole('button')[0]).toBe(second)
  expect(view.getAllByRole('button')[1]).toBe(first)
  expect(cleanup).not.toHaveBeenCalled()
  setItems([{id: 'first', name: 'Renamed'}])
  expect(cleanup).toHaveBeenCalledExactlyOnceWith('second')
  expect(second).not.toBeInTheDocument()
  view.unmount()
  expect(cleanup).toHaveBeenLastCalledWith('first')
  expect(cleanup).toHaveBeenCalledTimes(2)
})
