/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PModalTabList} from '../PModalTabList'

afterEach(() => vi.unstubAllGlobals())

it('should show default arrows only toward overflowing tabs and disconnect on unmount', () => {
  const disconnect = vi.fn()
  let resize = () => {}
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      observe = vi.fn()
      disconnect = disconnect
    },
  )
  const view = render(() => (
    <Tabs defaultValue="first">
      <PModalTabList
        accessibleLabel="Categories"
        items={[
          {icon: 'i-tabler-book', label: 'First', value: 'first'},
          {icon: 'i-tabler-note', label: 'Second', value: 'second'},
        ]}
      />
    </Tabs>
  ))
  const list = screen.getByRole('tablist')
  const scrollBy = vi.fn()
  Object.defineProperties(list, {
    clientWidth: {configurable: true, value: 100},
    scrollBy: {value: scrollBy},
    scrollLeft: {value: 0, writable: true},
    scrollWidth: {configurable: true, value: 300},
  })
  resize()
  expect(screen.queryByRole('button', {name: '이전 탭 보기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '다음 탭 보기'}))
  expect(scrollBy).toHaveBeenCalledWith({behavior: 'smooth', left: 70})
  list.scrollLeft = 200
  fireEvent.scroll(list)
  expect(screen.queryByRole('button', {name: '다음 탭 보기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '이전 탭 보기'}))
  expect(scrollBy).toHaveBeenLastCalledWith({behavior: 'smooth', left: -70})
  list.scrollLeft = 0
  Object.defineProperty(list, 'scrollWidth', {value: 100})
  resize()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
