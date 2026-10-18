/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SContextMenu} from '../SContextMenu'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
describe('SContextMenu', () => {
  const observe = vi.fn()
  const disconnect = vi.fn()
  let resized: ResizeObserverCallback
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resized = callback
        }
        observe = observe
        disconnect = disconnect
      },
    )
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    if (originalPopover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
    }
  })

  it('should position with the measured border box instead of assuming a host line-height unit', () => {
    const rectangle = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 208, 148))
    render(() => <SContextMenu x={310} y={426} items={[{label: 'Copy', onSelect: vi.fn()}]} />)
    const menu = screen.getByRole('menu', {name: '작업'})
    expect(menu.style.getPropertyValue('--menu-height')).toBe('148px')
    expect(menu.style.getPropertyValue('--menu-width')).toBe('208px')
    expect(menu.style.getPropertyValue('--menu-x')).toBe('310px')
    expect(menu.style.getPropertyValue('--menu-y')).toBe('426px')
    expect(rectangle).toHaveBeenCalledOnce()
    expect(observe).toHaveBeenCalledWith(menu, {box: 'border-box'})
    expect(document.activeElement).toBe(screen.getByRole('menuitem', {name: 'Copy'}))
  })

  it('should update measurements after font or content resize and disconnect when closed', () => {
    const rectangle = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValueOnce(new DOMRect(0, 0, 208, 148))
      .mockReturnValue(new DOMRect(0, 0, 176, 230))
    const {unmount} = render(() => <SContextMenu x={500} y={700} items={[]} />)
    resized([], {disconnect, observe, unobserve: vi.fn()})
    const menu = screen.getByRole('menu', {name: '작업'})
    expect(rectangle).toHaveBeenCalledTimes(2)
    expect(menu.style.getPropertyValue('--menu-height')).toBe('230px')
    expect(menu.style.getPropertyValue('--menu-width')).toBe('176px')
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('should retain the initial measured position when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 120),
    )
    render(() => <SContextMenu x={100} y={200} items={[]} />)
    expect(screen.getByRole('menu', {name: '작업'}).style.getPropertyValue('--menu-height')).toBe(
      '120px',
    )
  })
})
