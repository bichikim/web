/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {createComponent, createSignal, onMount} from 'solid-js'
import {useSelectMenu} from '../use-select-menu'

afterEach(() => {
  vi.restoreAllMocks()
})

const renderSelectMenu = (options?: {onAnchorRectChange?: (rect: DOMRectReadOnly) => void}) => {
  const [getMenu, setMenu] = createSignal<ReturnType<typeof useSelectMenu> | undefined>()

  render(() =>
    createComponent(() => {
      const menu = useSelectMenu({
        onAnchorRectChange: options?.onAnchorRectChange,
      })

      onMount(() => {
        setMenu(menu)
      })

      return null
    }, {}),
  )

  return getMenu
}

const createTriggerClick = (button: HTMLButtonElement) => {
  return {
    currentTarget: button,
  } as MouseEvent & {currentTarget: HTMLButtonElement}
}

const createPointerEnter = (button: HTMLButtonElement) => {
  return {
    currentTarget: button,
  } as unknown as PointerEvent & {currentTarget: HTMLButtonElement}
}

describe('useSelectMenu', () => {
  it('should anchor the menu below the trigger when the trigger is clicked', () => {
    const menu = renderSelectMenu()()

    expect(menu).toBeDefined()

    const button = document.createElement('button')
    const list = document.createElement('div')
    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => false)

    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })

    menu?.registerPanel(list)
    menu?.handleTriggerClick(createTriggerClick(button))

    expect(menu?.left()).toBe(100)
    expect(menu?.top()).toBe(48)
    expect(list.showPopover).toHaveBeenCalledTimes(1)
  })

  it('should notify anchor rect changes when the trigger is clicked', () => {
    const onAnchorRectChange = vi.fn()
    const menu = renderSelectMenu({onAnchorRectChange})()

    expect(menu).toBeDefined()

    const button = document.createElement('button')
    const list = document.createElement('div')
    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => false)

    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    menu?.registerPanel(list)
    menu?.handleTriggerClick(createTriggerClick(button))

    expect(onAnchorRectChange).toHaveBeenCalledWith({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: expect.any(Function),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })
  })

  it('should sync open state from the popover open state', () => {
    const menu = renderSelectMenu()()

    expect(menu).toBeDefined()

    const list = document.createElement('div')
    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => true)

    menu?.registerPanel(list)
    menu?.onPanelToggle()

    expect(menu?.isOpen()).toBe(true)

    list.matches = vi.fn(() => false)
    menu?.onPanelToggle()

    expect(menu?.isOpen()).toBe(false)
  })

  it('should close the menu when Escape is pressed', () => {
    const menu = renderSelectMenu()()

    expect(menu).toBeDefined()

    const button = document.createElement('button')
    let isPopoverOpen = true
    const list = document.createElement('div')
    list.showPopover = vi.fn(() => {
      isPopoverOpen = true
    })
    list.hidePopover = vi.fn(() => {
      isPopoverOpen = false
    })
    list.matches = vi.fn((selector) => selector === ':popover-open' && isPopoverOpen)

    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    menu?.registerPanel(list)
    menu?.handleTriggerClick(createTriggerClick(button))

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))

    expect(list.hidePopover).toHaveBeenCalledTimes(1)
    expect(menu?.isOpen()).toBe(false)
  })

  it('should open the menu when the trigger is hovered', () => {
    const menu = renderSelectMenu()()

    expect(menu).toBeDefined()

    const button = document.createElement('button')
    const list = document.createElement('div')
    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => false)

    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    menu?.registerPanel(list)
    menu?.handleTriggerPointerEnter(createPointerEnter(button))

    expect(list.showPopover).toHaveBeenCalledTimes(1)
  })

  it('should cancel pending open work when the menu closes', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const menu = renderSelectMenu()()
    const button = document.createElement('button')
    const list = document.createElement('div')

    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => false)
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    menu?.registerPanel(list)
    menu?.handleTriggerClick(createTriggerClick(button))
    menu?.onHide()

    expect(requestFrame).toHaveBeenCalledTimes(1)
    expect(cancelFrame).toHaveBeenCalledWith(42)
  })

  it('should move focus with arrow keys inside the menu', () => {
    const menu = renderSelectMenu()()

    expect(menu).toBeDefined()

    const first = document.createElement('button')
    const second = document.createElement('button')
    const list = document.createElement('div')
    list.showPopover = vi.fn()
    list.hidePopover = vi.fn()
    list.matches = vi.fn(() => true)

    menu?.registerPanel(list)
    menu?.registerItem({disabled: () => false, element: first})
    menu?.registerItem({disabled: () => false, element: second})

    const focusFirst = vi.spyOn(first, 'focus')
    const focusSecond = vi.spyOn(second, 'focus')

    menu?.handleContentKeyDown(new KeyboardEvent('keydown', {key: 'Home'}))

    expect(focusFirst).toHaveBeenCalledTimes(1)

    menu?.handleContentKeyDown(new KeyboardEvent('keydown', {key: 'ArrowDown'}))

    expect(focusSecond).toHaveBeenCalledTimes(1)
  })
})
