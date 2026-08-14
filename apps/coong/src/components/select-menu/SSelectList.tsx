import {cx} from 'class-variance-authority'
import {splitProps} from 'solid-js'
import {HSelectContent, type HSelectContentProps} from './HSelectContent'

export interface SSelectListProps extends Omit<HSelectContentProps, 'class'> {
  /** Additional panel styles. Use `widthPx` for a deterministic width override. */
  class?: string
}

const defaultPanelClass = cx(
  ':uno: m-0 w-56 rounded-3 border-0 bg-white p-1 text-left',
  'shadow-[0_12px_30px_rgba(17,18,22,0.14)] ring-1 ring-black/8 backdrop:bg-transparent',
)

/** Styled popover panel for a select or menu. Use with `HSelectRoot` or a legacy controller. */
export function SSelectList(props: SSelectListProps) {
  const [local, listProps] = splitProps(props, ['class', 'controller', 'left', 'top'])

  return (
    <HSelectContent
      {...listProps}
      controller={local.controller}
      left={local.left}
      top={local.top}
      class={cx(defaultPanelClass, local.class)}
    />
  )
}
