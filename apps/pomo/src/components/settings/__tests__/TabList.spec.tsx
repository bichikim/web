/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PSettingsTabList} from '../TabList'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

beforeEach(() => {
  TestResizeObserver.instances.length = 0
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should show scroll hints, scroll in both directions, and react to layout changes', () => {
  const {unmount} = render(() => (
    <Tabs defaultValue="general">
      <PSettingsTabList />
    </Tabs>
  ))
  const tabList = screen.getByRole('tablist')
  const scrollBy = vi.fn()
  Object.defineProperties(tabList, {
    clientWidth: {configurable: true, value: 100},
    scrollBy: {configurable: true, value: scrollBy},
    scrollLeft: {configurable: true, value: 20, writable: true},
    scrollWidth: {configurable: true, value: 300},
  })

  TestResizeObserver.instances[0]?.trigger()
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(2)
  expect(buttons[1]).toHaveClass(
    'w-10',
    'bg-gradient-to-r',
    'from-transparent',
    'to-surface-strong',
  )
  fireEvent.click(buttons[0]!)
  fireEvent.click(buttons[1]!)
  expect(scrollBy).toHaveBeenNthCalledWith(1, {behavior: 'smooth', left: -70})
  expect(scrollBy).toHaveBeenNthCalledWith(2, {behavior: 'smooth', left: 70})

  Object.defineProperty(tabList, 'scrollLeft', {configurable: true, value: 0, writable: true})
  fireEvent.scroll(tabList)
  expect(screen.getAllByRole('button')).toHaveLength(1)

  Object.defineProperty(tabList, 'scrollWidth', {configurable: true, value: 100})
  TestResizeObserver.instances[0]?.trigger()
  expect(screen.queryAllByRole('button')).toHaveLength(0)

  unmount()
  expect(TestResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce()
})
