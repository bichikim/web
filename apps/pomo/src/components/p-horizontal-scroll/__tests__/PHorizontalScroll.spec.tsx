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

it.each([
  {direction: 'ltr', label: 'Next', offset: 700},
  {direction: 'ltr', label: 'Previous', offset: 0},
  {direction: 'rtl', label: 'Previous', offset: -700},
])(
  'should retain focus when scrolling removes the $label edge in $direction',
  ({direction, label, offset}) => {
    render(() => (
      <PHorizontalScroll accessibleLabel="Cards" leftLabel="Previous" rightLabel="Next">
        <div>Cards</div>
      </PHorizontalScroll>
    ))
    const region = screen.getByRole('region', {name: 'Cards'})
    region.style.direction = direction
    Object.defineProperties(region, {
      clientWidth: {value: 300},
      scrollWidth: {value: 1000},
    })
    region.scrollLeft = direction === 'rtl' ? -350 : 350
    fireEvent.scroll(region)
    const edge = screen.getByRole('button', {name: label})
    edge.focus()
    const focus = vi.spyOn(region, 'focus')

    region.scrollLeft = offset
    fireEvent.scroll(region)

    expect(screen.queryByRole('button', {name: label})).toBeNull()
    expect(region).toHaveFocus()
    expect(focus).toHaveBeenCalledExactlyOnceWith({preventScroll: true})
  },
)

it('should retain focused edge navigation when resizing removes overflow', () => {
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
    <PHorizontalScroll accessibleLabel="Cards">
      <div>Cards</div>
    </PHorizontalScroll>
  ))
  const region = screen.getByRole('region', {name: 'Cards'})
  Object.defineProperties(region, {
    clientWidth: {configurable: true, value: 300},
    scrollWidth: {value: 1000},
  })
  resize()
  screen.getByRole('button', {name: '오른쪽으로 이동'}).focus()
  Object.defineProperty(region, 'clientWidth', {value: 1000})

  resize()

  expect(screen.queryAllByRole('button')).toHaveLength(0)
  expect(region).toHaveFocus()
})

it('should preserve external focus and avoid focusing on unchanged measurements or unmount', () => {
  const rendered = render(() => (
    <>
      <input aria-label="Other" />
      <PHorizontalScroll accessibleLabel="Cards">
        <div>Cards</div>
      </PHorizontalScroll>
    </>
  ))
  const region = screen.getByRole('region', {name: 'Cards'})
  Object.defineProperties(region, {clientWidth: {value: 300}, scrollWidth: {value: 1000}})
  fireEvent.scroll(region)
  const focus = vi.spyOn(region, 'focus')
  screen.getByRole('textbox', {name: 'Other'}).focus()
  region.scrollLeft = 700
  fireEvent.scroll(region)
  expect(screen.getByRole('textbox', {name: 'Other'})).toHaveFocus()
  fireEvent.scroll(region)
  rendered.unmount()
  expect(focus).not.toHaveBeenCalled()
})
