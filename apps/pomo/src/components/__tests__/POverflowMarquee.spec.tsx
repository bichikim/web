/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {POverflowMarquee} from '../POverflowMarquee'

const resizeObservers: ResizeObserverMock[] = []

class ResizeObserverMock {
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    resizeObservers.push(this)
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

describe('POverflowMarquee', () => {
  beforeEach(() => {
    resizeObservers.length = 0
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  afterEach(() => {
    cleanup()
    vi.doUnmock('solid-js')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('should tolerate missing measured elements during lifecycle setup', async () => {
    vi.resetModules()
    vi.doMock('solid-js', async () => {
      const solid = await vi.importActual<typeof import('solid-js')>('solid-js')
      let signalIndex = 0

      return {
        ...solid,
        createSignal: ((initialValue?: unknown) => {
          signalIndex += 1

          if (signalIndex === 1 || signalIndex === 3) {
            return [() => undefined, vi.fn()]
          }

          return solid.createSignal(initialValue)
        }) as typeof solid.createSignal,
      }
    })
    const {POverflowMarquee: MarqueeWithoutRefs} = await import('../POverflowMarquee')

    const result = render(() => <MarqueeWithoutRefs text="Track title" />)

    expect(result.container.querySelector('.pomo-overflow-marquee')).not.toBeNull()
    expect(resizeObservers).toHaveLength(0)
  })

  it('should measure once without observing in browsers that lack ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined)

    const result = render(() => <POverflowMarquee text="Track title" />)

    expect(result.container.querySelector('.pomo-overflow-marquee')).not.toBeNull()
    expect(resizeObservers).toHaveLength(0)
  })

  it('should animate only when the text exceeds its viewport', () => {
    const result = render(() => <POverflowMarquee text="A long track title" />)
    const viewport = result.container.querySelector('.pomo-overflow-marquee')
    const track = result.container.querySelector('.pomo-overflow-marquee__track')
    const content = result.container.querySelector('.pomo-overflow-marquee__content')

    if (
      !(viewport instanceof HTMLElement) ||
      !(track instanceof HTMLElement) ||
      !(content instanceof HTMLElement)
    ) {
      throw new TypeError('Expected the overflow marquee elements to be rendered')
    }

    Object.defineProperty(viewport, 'clientWidth', {configurable: true, value: 100})
    Object.defineProperty(content, 'scrollWidth', {configurable: true, value: 112})
    resizeObservers[0]?.notify()

    expect(viewport.getAttribute('data-overflowing')).toBe('true')
    expect(track.classList.contains('animate-overflow-marquee')).toBe(true)
    expect(track.classList.contains('group-hover:[animation-play-state:paused]')).toBe(true)
    expect(track.classList.contains('group-focus:[animation-play-state:paused]')).toBe(true)
    expect(track.classList.contains('motion-reduce:animate-none')).toBe(true)
    expect(viewport.getAttribute('tabindex')).toBe('0')
    expect(viewport.getAttribute('aria-label')).toContain('흐름이 일시 정지됩니다')
    expect(track.style.getPropertyValue('--pomo-marquee-distance')).toBe('144px')
    expect(track.style.animationDuration).toBe('6s')
    const clone = result.container.querySelector('.pomo-overflow-marquee__clone')
    expect(clone?.getAttribute('aria-hidden')).toBe('true')
    expect(clone?.textContent).toBe('A long track title')

    Object.defineProperty(content, 'scrollWidth', {configurable: true, value: 90})
    resizeObservers[0]?.notify()

    expect(viewport.hasAttribute('data-overflowing')).toBe(false)
    expect(track.classList.contains('animate-overflow-marquee')).toBe(false)
    expect(viewport.hasAttribute('tabindex')).toBe(false)
    expect(viewport.hasAttribute('aria-label')).toBe(false)
    expect(result.container.querySelector('.pomo-overflow-marquee__clone')).toBeNull()
  })

  it('should observe both measured elements and disconnect on cleanup', () => {
    const result = render(() => <POverflowMarquee text="Track title" />)
    const resizeObserver = resizeObservers[0]

    expect(resizeObserver?.observe).toHaveBeenCalledTimes(2)
    result.unmount()
    expect(resizeObserver?.disconnect).toHaveBeenCalledOnce()
  })

  it('should leave the viewport width constraint to its caller', () => {
    const result = render(() => <POverflowMarquee class="max-w-[40%]" text="Track artist" />)
    const viewport = result.container.querySelector('.pomo-overflow-marquee')

    expect(viewport?.classList.contains('max-w-[40%]')).toBe(true)
    expect(viewport?.classList.contains('max-w-full')).toBe(false)
  })

  it('should delegate keyboard pausing to a focusable parent when requested', () => {
    const result = render(() => <POverflowMarquee focusable={false} text="Track title" />)
    const viewport = result.container.querySelector('.pomo-overflow-marquee')
    const content = result.container.querySelector('.pomo-overflow-marquee__content')

    if (!(viewport instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      throw new TypeError('Expected the overflow marquee elements to be rendered')
    }

    Object.defineProperty(viewport, 'clientWidth', {configurable: true, value: 80})
    Object.defineProperty(content, 'scrollWidth', {configurable: true, value: 120})
    resizeObservers[0]?.notify()

    expect(viewport.getAttribute('data-overflowing')).toBe('true')
    expect(viewport.hasAttribute('tabindex')).toBe(false)
    expect(viewport.hasAttribute('aria-label')).toBe(false)
  })
})
