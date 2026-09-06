import {createEffect, createSignal, type JSX, onCleanup} from 'solid-js'
import {useTooltip} from './context'

export interface HTooltipContentProps {
  readonly children?: JSX.Element
  readonly class?: string
}

export const HTooltipContent = (props: HTooltipContentProps) => {
  const tooltip = useTooltip()
  const [element, setElement] = createSignal<HTMLDivElement>()
  createEffect(() => {
    const content = element()
    if (content === undefined || !tooltip.isOpen()) {
      return
    }
    content.showPopover()
    onCleanup(() => {
      if (content.isConnected) {
        content.hidePopover()
      }
    })
  })

  return (
    <div
      class={props.class}
      data-pomo-tooltip-content=""
      hidden={!tooltip.isOpen()}
      id={tooltip.id}
      onPointerEnter={tooltip.cancelClose}
      onPointerLeave={tooltip.scheduleClose}
      popover="manual"
      ref={setElement}
      role="tooltip"
      style={{'--pomo-tooltip-anchor': tooltip.anchor}}
    >
      {props.children}
    </div>
  )
}
