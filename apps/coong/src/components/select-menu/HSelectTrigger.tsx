import {type ComponentProps, type JSX, Show, createMemo, splitProps} from 'solid-js'
import {useSelectMenuContext} from './context'

export interface HSelectTriggerPassArg {
  'aria-controls': string
  'aria-expanded': boolean
  'aria-haspopup': 'menu'
  isOpen: boolean
  onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  onPointerDown: JSX.EventHandler<HTMLButtonElement, PointerEvent>
  onPointerEnter: JSX.EventHandler<HTMLButtonElement, PointerEvent>
}

export interface HSelectTriggerSelfProps extends Omit<ComponentProps<'button'>, 'children'> {
  children: JSX.Element
}

export interface HSelectTriggerPassProps {
  children: (arg: HSelectTriggerPassArg) => JSX.Element
}

export type HSelectTriggerProps = HSelectTriggerSelfProps | HSelectTriggerPassProps

/** Headless trigger wired to `HSelectRoot` positioning and open state. */
export const HSelectTrigger = (props: HSelectTriggerProps) => {
  const {controller} = useSelectMenuContext()
  const [innerProps, restProps] = splitProps(props as HSelectTriggerSelfProps, ['children'])

  const triggerArg = createMemo<HSelectTriggerPassArg>(() => ({
    'aria-controls': controller.listId,
    'aria-expanded': controller.isOpen(),
    'aria-haspopup': 'menu',
    isOpen: controller.isOpen(),
    onClick: controller.handleTriggerClick,
    onPointerDown: controller.handleTriggerPointerDown,
    onPointerEnter: controller.handleTriggerPointerEnter,
  }))

  const children = createMemo(() => {
    if (typeof props.children === 'function') {
      return props.children(triggerArg())
    }

    return props.children
  })

  return (
    <Show
      when={typeof props.children === 'function'}
      fallback={
        <button
          {...restProps}
          type={restProps.type ?? 'button'}
          aria-controls={triggerArg()['aria-controls']}
          aria-expanded={triggerArg()['aria-expanded']}
          aria-haspopup={triggerArg()['aria-haspopup']}
          onClick={triggerArg().onClick}
          onPointerDown={triggerArg().onPointerDown}
          onPointerEnter={triggerArg().onPointerEnter}
        >
          {children()}
        </button>
      }
    >
      {children()}
    </Show>
  )
}
