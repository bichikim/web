/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SPdfTextLayer} from '../SPdfTextLayer'
import type {PdfPageText} from '../pdf/types'
vi.mock('../pdf/use-text-metrics', () => ({useTextMetrics: vi.fn()}))

const text: PdfPageText = {
  offsets: [
    {end: 6, start: 0},
    {end: 11, start: 6},
  ],
  runs: [
    {
      angle: 0,
      direction: 'ltr',
      font: 'sans-serif',
      height: 20,
      lineBreak: false,
      offset: 0,
      text: 'hello ',
      width: 60,
      x: 10,
      y: 10,
    },
    {
      angle: 0,
      direction: 'ltr',
      font: 'sans-serif',
      height: 20,
      lineBreak: true,
      offset: 6,
      text: 'world',
      width: 60,
      x: 70,
      y: 10,
    },
  ],
  source: 'hello world\n',
}
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  globalThis.getSelection()?.removeAllRanges()
  if (originalScroll === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  }
})
describe('SPdfTextLayer', () => {
  it('should preserve native selection text with search highlights spanning multiple PDF runs', () => {
    const [matches, setMatches] = createSignal([{end: 9, start: 3}])
    render(() => <SPdfTextLayer text={text} scale={1} matches={matches()} activeMatch={0} />)
    const region = screen.getByRole('region', {name: 'PDF 텍스트'})
    const range = document.createRange()
    range.selectNodeContents(region)
    const selection = globalThis.getSelection()
    selection?.addRange(range)
    expect(selection?.toString()).toBe('hello world')
    expect(Array.from(region.querySelectorAll('mark'), (mark) => mark.textContent)).toEqual([
      'lo ',
      'wor',
    ])
    setMatches([])
    expect(region.textContent).toBe('hello world')
    expect(region.querySelectorAll('mark')).toHaveLength(0)
  })
  it('should scroll the active result into view on a search navigation request', () => {
    const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView)
    const [request, setRequest] = createSignal(0)
    render(() => (
      <SPdfTextLayer
        text={text}
        scale={1}
        matches={[{end: 11, start: 6}]}
        activeMatch={0}
        scrollRequest={request()}
      />
    ))
    expect(scroll).toHaveBeenCalled()
    scroll.mockClear()
    setRequest(1)
    expect(scroll).toHaveBeenCalledOnce()
  })
  it('should reveal the replacement highlight when a new query keeps the same active index', () => {
    const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView)
    const [matches, setMatches] = createSignal([{end: 5, start: 0}])
    render(() => <SPdfTextLayer text={text} scale={1} matches={matches()} activeMatch={0} />)
    scroll.mockClear()
    setMatches([{end: 11, start: 6}])
    const region = screen.getByRole('region', {name: 'PDF 텍스트'})
    expect(region.querySelector('mark')?.textContent).toBe('world')
    expect(scroll.mock.contexts.at(-1)).toBe(region.querySelector('mark'))
  })
})
