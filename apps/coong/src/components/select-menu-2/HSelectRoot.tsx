import {type Rect} from '@winter-love/utils'
import {createSignal, createUniqueId, type ParentProps} from 'solid-js'
import {SelectMenu2Context} from './context'
import {getBounds} from './get-bounds'
import {useAnchorBoundsAutoUpdate} from './use-anchor-bounds-auto-update'

export interface HSelectRootProps extends ParentProps {
  /** @see SelectMenuPositionOptions.anchorGapPx */
  anchorGapPx?: number
  /** @see SelectMenuPositionOptions.listWidthPx */
  listWidthPx?: number
  onClosed?: () => void
  onOpened?: (element: HTMLElement) => void
  /** @see SelectMenuPositionOptions.viewportPaddingPx */
  viewportPaddingPx?: number
}

/** Root provider for headless select-menu primitives. Manages open state and anchor bounds. */
export const HSelectRoot = (props: HSelectRootProps) => {
  const listId = createUniqueId()
  const [open, setOpen] = createSignal(false)
  const [anchorElement, setAnchorElement] = createSignal<HTMLElement | undefined>()
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement | undefined>()
  const [anchorBounds, setAnchorBounds] = createSignal<Rect | undefined>()
  const [panelPosition, setPanelPosition] = createSignal({left: 0, top: 0})

  const syncAnchorBounds = (element: HTMLElement) => {
    setAnchorElement(element)
    setAnchorBounds(getBounds(element))
  }

  const onOpen = (element: HTMLElement) => {
    const wasOpen = open()
    syncAnchorBounds(element)

    if (!wasOpen) {
      setOpen(true)
      props.onOpened?.(element)
    }
  }

  const onClose = () => {
    if (!open()) {
      return
    }

    setOpen(false)
    setAnchorElement(undefined)
    setAnchorBounds(undefined)
    setPanelPosition({left: 0, top: 0})
    props.onClosed?.()
  }

  const registerPanel = (element: HTMLDivElement) => {
    setPanelElement(element)
  }

  const unregisterPanel = (element: HTMLDivElement) => {
    if (panelElement() === element) {
      setPanelElement(undefined)
    }
  }

  useAnchorBoundsAutoUpdate(
    {
      anchorElement,
      open,
      panelElement,
      setAnchorBounds,
      setPanelPosition,
    },
    () => ({
      anchorGapPx: props.anchorGapPx,
      listWidthPx: props.listWidthPx,
      viewportPaddingPx: props.viewportPaddingPx,
    }),
  )

  return (
    <SelectMenu2Context.Provider
      value={{
        anchorBounds,
        left: () => panelPosition().left,
        listId,
        onClose,
        onOpen,
        open,
        registerPanel,
        top: () => panelPosition().top,
        unregisterPanel,
      }}
    >
      {props.children}
    </SelectMenu2Context.Provider>
  )
}
