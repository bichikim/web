import {createSignal, type JSX, onMount} from 'solid-js'
import {createTimeout} from '@winter-love/solid-use/timeout'
import {tooltipContext, type TooltipRequest} from './context'

const CLOSE_DELAY = 150

export interface PTooltipProviderProps {
  readonly children?: JSX.Element
}

export const PTooltipProvider = (props: PTooltipProviderProps) => {
  const [supported, setSupported] = createSignal<boolean>()
  const [active, setActive] = createSignal<TooltipRequest>()
  const close = () => {
    cancelClose()
    setActive(undefined)
  }
  const {cancel: cancelClose, execute: scheduleClose} = createTimeout(close, CLOSE_DELAY)
  const present = (request: TooltipRequest) => {
    if (
      !supported() ||
      !request.target.isConnected ||
      request.target.matches(':disabled, [disabled], [aria-disabled="true"]')
    ) {
      return
    }
    cancelClose()
    setActive(request)
  }
  const dismiss = (owner: string, immediate = false) => {
    if (active()?.owner !== owner) {
      return
    }
    if (immediate) {
      close()
    } else {
      scheduleClose()
    }
  }
  onMount(() =>
    setSupported(
      typeof HTMLElement.prototype.showPopover === 'function' &&
        CSS.supports('anchor-name', '--tooltip') &&
        CSS.supports('position-area', 'top') &&
        CSS.supports('position-try-fallbacks', 'flip-block'),
    ),
  )
  return (
    <tooltipContext.Provider
      value={{active, cancelClose, close, dismiss, present, scheduleClose, supported}}
    >
      {props.children}
    </tooltipContext.Provider>
  )
}
