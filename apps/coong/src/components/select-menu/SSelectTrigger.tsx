import {type JSX, splitProps} from 'solid-js'
import {HSelectTrigger, type HSelectTriggerSelfProps} from './HSelectTrigger'
import {SSelectButton} from './SSelectButton'

export interface SSelectTriggerProps extends HSelectTriggerSelfProps {}

/** Styled trigger wired to `HSelectRoot`. */
export const SSelectTrigger = (props: SSelectTriggerProps) => {
  const [local, triggerProps] = splitProps(props, ['children', 'class'])

  return (
    <HSelectTrigger>
      {(trigger): JSX.Element => (
        <SSelectButton
          {...triggerProps}
          class={local.class}
          aria-controls={trigger['aria-controls']}
          aria-expanded={trigger['aria-expanded']}
          aria-haspopup={trigger['aria-haspopup']}
          onClick={trigger.onClick}
          onPointerDown={trigger.onPointerDown}
          onPointerEnter={trigger.onPointerEnter}
        >
          {local.children}
        </SSelectButton>
      )}
    </HSelectTrigger>
  )
}
