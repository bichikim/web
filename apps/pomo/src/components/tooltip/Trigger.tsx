import type {JSX} from 'solid-js'
import {useTooltip} from './context'

export interface TooltipTriggerBindings {
  readonly 'attr:aria-describedby': string | undefined
  readonly 'attr:data-pomo-tooltip-trigger': string
  readonly style: JSX.CSSProperties
  readonly title: string | undefined
  readonly onPointerEnter: JSX.EventHandler<HTMLElement, PointerEvent>
  readonly onPointerLeave: JSX.EventHandler<HTMLElement, PointerEvent>
  readonly onPointerDown: JSX.EventHandler<HTMLElement, PointerEvent>
  readonly onFocus: JSX.EventHandler<HTMLElement, FocusEvent>
  readonly onBlur: JSX.EventHandler<HTMLElement, FocusEvent>
}

export interface HTooltipTriggerProps {
  readonly children: (bindings: TooltipTriggerBindings) => JSX.Element
  readonly label: string
}

export const HTooltipTrigger = (props: HTooltipTriggerProps) => {
  const tooltip = useTooltip()
  let pointerFocus = false
  let focused = false
  const bindings: TooltipTriggerBindings = {
    get 'attr:aria-describedby'() {
      return tooltip.isOpen() ? tooltip.id : undefined
    },
    'attr:data-pomo-tooltip-trigger': '',
    onBlur: () => {
      pointerFocus = false
      focused = false
      tooltip.scheduleClose()
    },
    onFocus: (event) => {
      if (!pointerFocus) {
        focused = true
        tooltip.open(event.currentTarget, true)
      }
    },
    onPointerDown: () => {
      pointerFocus = true
      tooltip.close()
    },
    onPointerEnter: (event) => {
      if (event.pointerType !== 'touch') {
        tooltip.open(event.currentTarget, false)
      }
    },
    onPointerLeave: () => {
      if (!focused) {
        tooltip.scheduleClose()
      }
    },
    style: {'--pomo-tooltip-anchor': tooltip.anchor},
    get title() {
      return tooltip.supported() === false ? props.label : undefined
    },
  }
  return <>{props.children(bindings)}</>
}
