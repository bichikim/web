import {cx} from 'class-variance-authority'
import {splitProps} from 'solid-js'
import {HSelectTrigger, type HSelectTriggerSelfProps} from './HSelectTrigger'

export interface SSelectTriggerProps extends HSelectTriggerSelfProps {}

const triggerClass = cx(
  ':uno: flex h-9 cursor-pointer items-center gap-1 rounded-full border-0',
  'bg-transparent px-3 text-3.5 font-600 text-#101114',
)

/** Styled trigger wired to `HSelectRoot`. */
export const SSelectTrigger = (props: SSelectTriggerProps) => {
  const [local, triggerProps] = splitProps(props, ['children', 'class'])

  return (
    <HSelectTrigger {...triggerProps} class={cx(triggerClass, local.class)}>
      {local.children}
    </HSelectTrigger>
  )
}
