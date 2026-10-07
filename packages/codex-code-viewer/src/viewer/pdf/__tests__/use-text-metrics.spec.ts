/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useTextMetrics} from '../use-text-metrics'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('useTextMetrics', () => {
  it('should fit PDF glyph widths, react to font metrics changes and release its observer', () => {
    const span = document.createElement('span')
    span.dataset.pdfWidth = '120'
    const container = document.createElement('div')
    container.append(span)
    const style = document.createElement('div').style
    Object.defineProperty(style, 'width', {value: '60px'})
    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue(style)
    let callback: ResizeObserverCallback | undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    const observer: ResizeObserver = {disconnect, observe, unobserve: vi.fn()}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(receive: ResizeObserverCallback) {
          callback = receive
        }
        disconnect = disconnect
        observe = observe
        unobserve = vi.fn()
      },
    )
    const dispose = createRoot((cleanup) => {
      useTextMetrics({
        container: () => container,
        text: () => ({offsets: [], runs: [], source: ''}),
      })
      return cleanup
    })
    expect(span.style.getPropertyValue('--pdf-stretch')).toBe('2')
    expect(observe).toHaveBeenCalledWith(span)
    callback?.(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: new DOMRect(0, 0, 40, 20),
          devicePixelContentBoxSize: [],
          target: span,
        },
      ],
      observer,
    )
    expect(span.style.getPropertyValue('--pdf-stretch')).toBe('3')
    dispose()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
