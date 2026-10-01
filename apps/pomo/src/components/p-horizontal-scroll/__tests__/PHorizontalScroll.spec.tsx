/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PHorizontalScroll} from '../index'

afterEach(() => vi.unstubAllGlobals())

it('should show only overflowing directions and keep keyboard focus in the viewport after moving', () => {
  let resize = () => {}
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  render(() => (
    <PHorizontalScroll accessibleLabel="Gallery">
      <div>Content</div>
    </PHorizontalScroll>
  ))
  const region = screen.getByRole('region', {name: 'Gallery'})
  const scrollBy = vi.fn()
  Object.defineProperties(region, {
    clientWidth: {configurable: true, value: 300},
    scrollBy: {value: scrollBy},
    scrollWidth: {configurable: true, value: 1000},
  })
  resize()
  expect(screen.queryByRole('button', {name: '왼쪽으로 이동'})).toBeNull()
  const right = screen.getByRole('button', {name: '오른쪽으로 이동'})
  right.focus()
  fireEvent.click(right)
  expect(scrollBy).toHaveBeenLastCalledWith({left: 240})
  expect(region).toHaveFocus()
  region.scrollLeft = 700
  fireEvent.scroll(region)
  expect(screen.queryByRole('button', {name: '오른쪽으로 이동'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '왼쪽으로 이동'}))
  expect(scrollBy).toHaveBeenLastCalledWith({left: -240})
  region.scrollLeft = 0
  Object.defineProperty(region, 'clientWidth', {value: 1000})
  resize()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

it('should refresh nested content overflow and accept caller labels and presentation classes', async () => {
  const [text, setText] = createSignal('Short')
  const [rightLabel, setRightLabel] = createSignal('Next cards')
  render(() => (
    <PHorizontalScroll
      buttonClass="text-[#e3c58c]"
      edgeClass="inset-y-10 from-[#102720] to-transparent"
      leftLabel="Previous cards"
      rightLabel={rightLabel()}
      viewportClass="border-t"
    >
      <div>{text()}</div>
    </PHorizontalScroll>
  ))
  const region = screen.getByRole('region', {name: '가로 목록'})
  Object.defineProperties(region, {
    clientWidth: {value: 300},
    scrollWidth: {get: () => (text() === 'Short' ? 300 : 1000)},
  })
  setText('Long content')
  await waitFor(() => expect(screen.getByRole('button', {name: 'Next cards'})).toBeInTheDocument())
  const right = screen.getByRole('button', {name: 'Next cards'})
  expect(region).toHaveClass('border-t', 'scroll-smooth', 'motion-reduce:scroll-auto')
  expect(right).toHaveClass('text-[#e3c58c]')
  expect(right.parentElement).toHaveClass('inset-y-10', 'from-[#102720]')
  setRightLabel('More items')
  expect(screen.getByRole('button', {name: 'More items'})).toBe(right)
  setText('Short')
  await waitFor(() => expect(screen.queryAllByRole('button')).toHaveLength(0))
})
