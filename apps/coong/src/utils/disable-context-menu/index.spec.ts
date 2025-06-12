/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi, afterEach} from 'vitest'
import {createDisableContextMenu, OFF_CONTEXT_MENU_FLAG} from './index'

describe('createDisableContextMenu', () => {
  afterEach(() => {
    window[OFF_CONTEXT_MENU_FLAG] = undefined
  })

  it('should disable context menu when off is true', () => {
    const disableContextMenu = createDisableContextMenu()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const preventDefaultSpy = vi.spyOn(MouseEvent.prototype, 'preventDefault')
    const stopPropagationSpy = vi.spyOn(MouseEvent.prototype, 'stopPropagation')

    disableContextMenu(true)
    expect(addEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function))
    expect(window[OFF_CONTEXT_MENU_FLAG]).toBe(true)

    // Simulate context menu event
    const event = new MouseEvent('contextmenu')
    const listener = addEventListenerSpy.mock.calls[0][1] as (event: MouseEvent) => void

    listener(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(stopPropagationSpy).toHaveBeenCalled()
    addEventListenerSpy.mockRestore()
    preventDefaultSpy.mockRestore()
    stopPropagationSpy.mockRestore()
  })

  it('should enable context menu when off is false', () => {
    const disableContextMenu = createDisableContextMenu()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    // First disable
    disableContextMenu(true)
    // Then enable
    disableContextMenu(false)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function))
    expect(window[OFF_CONTEXT_MENU_FLAG]).toBe(false)
    removeEventListenerSpy.mockRestore()
  })

  it('should not add listener if already disabled', () => {
    const disableContextMenu = createDisableContextMenu()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    // First disable
    disableContextMenu(true)
    // Try to disable again
    disableContextMenu(true)
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
    addEventListenerSpy.mockRestore()
  })

  it('should not remove listener if not disabled', () => {
    const disableContextMenu = createDisableContextMenu()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    // Try to enable without disabling first
    disableContextMenu(false)
    expect(removeEventListenerSpy).not.toHaveBeenCalled()
    removeEventListenerSpy.mockRestore()
  })
})
