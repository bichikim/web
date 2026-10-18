/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {SResizablePanels} from '../SResizablePanels'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SResizablePanels', () => {
  it('should expose a keyboard splitter and preserve width across toggles', () => {
    const [visible, setVisible] = createSignal(true)
    render(() => (
      <SResizablePanels visible={visible()} sidebar={<p>Files</p>}>
        <p>Code</p>
      </SResizablePanels>
    ))
    const separator = screen.getByRole('separator', {name: '파일 트리 너비 조절'})
    expect(separator.getAttribute('aria-orientation')).toBe('vertical')
    expect(separator.getAttribute('aria-valuemin')).toBe('200')
    fireEvent.keyDown(separator, {altKey: true, key: 'ArrowRight'})
    expect(separator.getAttribute('aria-valuenow')).toBe('288')
    fireEvent.keyDown(separator, {key: 'Home'})
    expect(separator.getAttribute('aria-valuenow')).toBe('200')
    setVisible(false)
    expect(screen.queryByRole('separator')).toBeNull()
    expect(screen.getByText('Code')).toBeTruthy()
    setVisible(true)
    expect(screen.getByRole('separator').getAttribute('aria-valuenow')).toBe('200')
  })
  it('should clamp on container resize and disconnect its observer on disposal', () => {
    const disconnect = vi.fn()
    let callback: ResizeObserverCallback | null = null
    const observer: ResizeObserver = {disconnect, observe: vi.fn(), unobserve: vi.fn()}
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function MockObserver(received: ResizeObserverCallback) {
        callback = received
        return observer
      }),
    )
    const mounted = render(() => (
      <SResizablePanels visible sidebar={<p>Files</p>}>
        <p>Code</p>
      </SResizablePanels>
    ))
    const target = mounted.container.firstElementChild
    if (target === null || callback === null) {
      throw new Error('Expected an observed panel container')
    }
    const notify: ResizeObserverCallback = callback
    notify(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: new DOMRect(0, 0, 500, 400),
          devicePixelContentBoxSize: [],
          target,
        },
      ],
      observer,
    )
    const separator = screen.getByRole('separator')
    expect(separator.getAttribute('aria-valuemax')).toBe('254')
    fireEvent.keyDown(separator, {key: 'End'})
    expect(separator.getAttribute('aria-valuenow')).toBe('254')
    mounted.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
  it('should capture the primary pointer and keep resizing outside the handle', () => {
    render(() => (
      <SResizablePanels visible sidebar={<p>Files</p>}>
        <p>Code</p>
      </SResizablePanels>
    ))
    const separator = screen.getByRole('separator')
    const capture = vi.fn()
    const release = vi.fn()
    Object.assign(separator, {
      hasPointerCapture: () => true,
      releasePointerCapture: release,
      setPointerCapture: capture,
    })
    const pointer = (type: string, clientX: number) =>
      Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX}), {
        isPrimary: true,
        pointerId: 1,
      })
    fireEvent(separator, pointer('pointerdown', 500))
    expect(capture).toHaveBeenCalledWith(1)
    expect(document.activeElement).toBe(separator)
    fireEvent(separator, pointer('pointermove', 550))
    expect(separator.getAttribute('aria-valuenow')).toBe('238')
    fireEvent(separator, pointer('pointerup', 550))
    expect(release).toHaveBeenCalledWith(1)
    fireEvent(separator, pointer('pointermove', 600))
    expect(separator.getAttribute('aria-valuenow')).toBe('238')
  })
})
