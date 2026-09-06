import {createSignal, createUniqueId, type JSX, onCleanup, onMount} from 'solid-js'
import {tooltipContext} from './context'
import './styles.css'

type CloseTooltip = () => void

const activeTooltips = new WeakMap<Document, CloseTooltip>()
const OPEN_DELAY = 400
const CLOSE_DELAY = 150

export interface HTooltipRootProps {
  readonly children?: JSX.Element
  readonly openDelay?: number
  readonly closeDelay?: number
}

export const HTooltipRoot = (props: HTooltipRootProps) => {
  const id = `pomo-tooltip-${createUniqueId()}`
  const [isOpen, setOpen] = createSignal(false)
  const [supported, setSupported] = createSignal<boolean>()
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let release: (() => void) | undefined

  const cancelClose = () => {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
  const close = () => {
    clearTimeout(openTimer)
    openTimer = undefined
    cancelClose()
    setOpen(false)
    release?.()
    release = undefined
  }
  const open = (source: HTMLElement, immediate: boolean) => {
    if (!supported() || source.matches(':disabled, [disabled], [aria-disabled="true"]')) {
      return
    }
    cancelClose()
    const owner = source.ownerDocument
    if (activeTooltips.get(owner) === close && isOpen()) {
      return
    }
    clearTimeout(openTimer)
    activeTooltips.get(owner)?.()
    activeTooltips.set(owner, close)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isOpen()) {
          event.stopPropagation()
          event.preventDefault()
        }
        close()
      }
    }
    owner.addEventListener('keydown', handleKey, true)
    owner.addEventListener('pointerdown', close, true)
    owner.addEventListener('click', close, true)
    owner.addEventListener('scroll', close, true)
    owner.defaultView?.addEventListener('blur', close)
    owner.defaultView?.addEventListener('resize', close)
    // oxlint-disable-next-line solid/reactivity -- Event listener disposal runs on close or unmount.
    release = () => {
      owner.removeEventListener('keydown', handleKey, true)
      owner.removeEventListener('pointerdown', close, true)
      owner.removeEventListener('click', close, true)
      owner.removeEventListener('scroll', close, true)
      owner.defaultView?.removeEventListener('blur', close)
      owner.defaultView?.removeEventListener('resize', close)
      if (activeTooltips.get(owner) === close) {
        activeTooltips.delete(owner)
      }
    }
    const handleReveal = () => {
      openTimer = undefined
      if (source.isConnected && !source.matches(':disabled, [disabled], [aria-disabled="true"]')) {
        setOpen(true)
      } else {
        close()
      }
    }
    if (immediate) {
      handleReveal()
    } else {
      openTimer = setTimeout(handleReveal, props.openDelay ?? OPEN_DELAY)
    }
  }
  const scheduleClose = () => {
    clearTimeout(openTimer)
    openTimer = undefined
    cancelClose()
    closeTimer = setTimeout(close, props.closeDelay ?? CLOSE_DELAY)
  }

  onMount(() => {
    setSupported(
      typeof HTMLElement.prototype.showPopover === 'function' &&
        CSS.supports('anchor-name', '--tooltip') &&
        CSS.supports('position-area', 'top') &&
        CSS.supports('position-try-fallbacks', 'flip-block'),
    )
  })
  onCleanup(close)

  return (
    <tooltipContext.Provider
      value={{
        anchor: `--${id}`,
        cancelClose,
        close,
        id,
        isOpen,
        open,
        scheduleClose,
        supported,
      }}
    >
      {props.children}
    </tooltipContext.Provider>
  )
}
