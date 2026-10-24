/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import 'media-chrome/media-time-range'

vi.hoisted(() => {
  if (typeof globalThis.ResizeObserver !== 'function') {
    class TestResizeObserver {
      readonly disconnect = vi.fn()
      readonly observe = vi.fn()
      readonly unobserve = vi.fn()
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    })
  }

  if (typeof globalThis.matchMedia !== 'function') {
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    })
  }
})

describe('MediaTimeRange', () => {
  it('should propagate the Solid boolean attribute to the real range input', () => {
    const [disabled, setDisabled] = createSignal(true)
    let dispose: () => void = () => undefined
    const renderedRange = createRoot((disposeRoot) => {
      dispose = disposeRoot
      return <media-time-range bool:disabled={disabled()} />
    })

    try {
      if (!(renderedRange instanceof HTMLElement)) {
        throw new TypeError('Expected Media Chrome range element')
      }

      const range = renderedRange
      const input = range.shadowRoot?.querySelector('input')

      expect(customElements.get('media-time-range')).toBeTruthy()
      expect(input).toBeInstanceOf(HTMLInputElement)
      expect(range.hasAttribute('disabled')).toBe(true)
      expect(input?.hasAttribute('disabled')).toBe(true)
      expect(input?.disabled).toBe(true)

      setDisabled(false)

      expect(range.hasAttribute('disabled')).toBe(false)
      expect(input?.hasAttribute('disabled')).toBe(false)
      expect(input?.disabled).toBe(false)
    } finally {
      dispose()
    }
  })
})
