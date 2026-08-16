import {type Accessor, createEffect, createSignal, createUniqueId, onCleanup} from 'solid-js'
import {type SelectMenuAnchorRect, toSelectMenuAnchorRect} from './select-menu-anchor-rect'
import {createSelectMenuKeyboard} from './select-menu-keyboard'
import {computeSelectMenuPosition} from './select-menu-position'

export type {SelectMenuAnchorRect} from './select-menu-anchor-rect'

export interface SelectMenuItemRegistration {
  disabled: Accessor<boolean>
  element: HTMLElement
}

export interface UseSelectMenuProps {
  anchorGapPx?: number
  focusOnOpen?: boolean
  listWidthPx?: number
  onAnchorRectChange?: (rect: SelectMenuAnchorRect) => void
  onOpenChange?: (isOpen: boolean) => void
  viewportPaddingPx?: number
}

export interface SelectMenuController {
  handleContentKeyDown: (event: KeyboardEvent) => void
  handleTriggerClick: (event: MouseEvent & {currentTarget: HTMLButtonElement}) => void
  handleTriggerPointerDown: (event: PointerEvent & {currentTarget: HTMLButtonElement}) => void
  handleTriggerPointerEnter: (event: PointerEvent & {currentTarget: HTMLButtonElement}) => void
  isItemFocused: (element: HTMLElement | undefined) => boolean
  isOpen: Accessor<boolean>
  left: Accessor<number>
  listId: string
  onHide: () => void
  onPanelToggle: () => void
  registerItem: (registration: SelectMenuItemRegistration) => () => void
  registerPanel: (element: HTMLDivElement) => void
  top: Accessor<number>
}

const createOpenFrameScheduler = (onFrame: () => void) => {
  let frameId: number | undefined

  const cancel = () => {
    if (frameId === undefined) {
      return
    }

    cancelAnimationFrame(frameId)
    frameId = undefined
  }

  const schedule = () => {
    cancel()
    frameId = requestAnimationFrame(() => {
      frameId = undefined
      onFrame()
    })
  }

  onCleanup(cancel)

  return {cancel, schedule}
}

export const useSelectMenu = (props: UseSelectMenuProps = {}): SelectMenuController => {
  const listId = createUniqueId()
  const [isOpen, setIsOpen] = createSignal(false)
  const [position, setPosition] = createSignal({left: 0, top: 0})
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | undefined>()
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement | undefined>()
  const [items, setItems] = createSignal<SelectMenuItemRegistration[]>([])
  const [focusedElement, setFocusedElement] = createSignal<HTMLElement | undefined>()
  let suppressNextTriggerClickOpen = false

  const focusOnOpen = () => props.focusOnOpen ?? false
  const keyboard = createSelectMenuKeyboard({
    getFocusedElement: focusedElement,
    getItems: items,
    setFocusedElement,
  })

  const syncOpenState = () => {
    const nextIsOpen = panelElement()?.matches(':popover-open') ?? false
    setIsOpen(nextIsOpen)
    props.onOpenChange?.(nextIsOpen)
  }

  const applyAnchorRect = (anchorRect: SelectMenuAnchorRect) => {
    props.onAnchorRectChange?.(anchorRect)

    const nextPosition = computeSelectMenuPosition({
      anchorGapPx: props.anchorGapPx,
      anchorRect,
      listWidthPx: props.listWidthPx,
      panelElement: panelElement(),
      viewportPaddingPx: props.viewportPaddingPx,
    })

    if (nextPosition) {
      setPosition(nextPosition)
    }
  }

  const notifyAnchorRectFromTrigger = () => {
    const trigger = triggerElement()

    if (!trigger) {
      return
    }

    applyAnchorRect(toSelectMenuAnchorRect(trigger.getBoundingClientRect()))
  }

  const openFrame = createOpenFrameScheduler(() => {
    notifyAnchorRectFromTrigger()
    syncOpenState()

    if (panelElement()?.matches(':popover-open') && focusOnOpen()) {
      keyboard.focusFirstItem()
    }
  })

  const openFromTrigger = (trigger: HTMLButtonElement) => {
    setTriggerElement(trigger)
    applyAnchorRect(toSelectMenuAnchorRect(trigger.getBoundingClientRect()))
    panelElement()?.showPopover()
    syncOpenState()
    openFrame.schedule()
  }

  const onHide = () => {
    openFrame.cancel()
    panelElement()?.hidePopover()
    setFocusedElement(undefined)
    syncOpenState()
  }

  const handleTriggerPointerDown = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (!isOpen()) {
      return
    }

    suppressNextTriggerClickOpen = true
    onHide()
    event.preventDefault()
  }

  const handleTriggerPointerEnter = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (isOpen()) {
      return
    }

    openFromTrigger(event.currentTarget)
  }

  const handleTriggerClick = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
    if (suppressNextTriggerClickOpen) {
      suppressNextTriggerClickOpen = false

      return
    }

    if (isOpen()) {
      onHide()

      return
    }

    openFromTrigger(event.currentTarget)
  }

  const onPanelToggle = () => {
    syncOpenState()

    if (panelElement()?.matches(':popover-open')) {
      openFrame.schedule()

      return
    }

    openFrame.cancel()
  }

  const registerItem = (registration: SelectMenuItemRegistration) => {
    setItems((previousItems) => [...previousItems, registration])

    return () => {
      setItems((previousItems) =>
        previousItems.filter((item) => item.element !== registration.element),
      )

      if (focusedElement() === registration.element) {
        setFocusedElement(undefined)
      }
    }
  }

  const isItemFocused = (element: HTMLElement | undefined) => {
    return element !== undefined && focusedElement() === element
  }

  createEffect(() => {
    if (!isOpen()) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide()
        triggerElement()?.focus()
      }
    }

    const handleReposition = () => {
      notifyAnchorRectFromTrigger()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    })
  })

  return {
    handleContentKeyDown: keyboard.handleContentKeyDown,
    handleTriggerClick,
    handleTriggerPointerDown,
    handleTriggerPointerEnter,
    isItemFocused,
    isOpen,
    left: () => position().left,
    listId,
    onHide,
    onPanelToggle,
    registerItem,
    registerPanel: setPanelElement,
    top: () => position().top,
  }
}
