import {cx} from 'class-variance-authority'
import {type Accessor, splitProps} from 'solid-js'
import {HSelectContent, type HSelectContentProps} from './HSelectContent'
import type {SelectMenuController} from './use-select-menu'

export interface SSelectListProps extends Omit<HSelectContentProps, 'class'> {
  controller?: SelectMenuController
  left?: Accessor<number>
  top?: Accessor<number>
  /** Appended after default panel styles (e.g. width override). */
  class?: string
}

const defaultPanelClass = cx(
  ':uno: z-50 m-0 w-56 rounded-3 border-0 bg-white p-1 text-left',
  'shadow-[0_12px_30px_rgba(17,18,22,0.14)] ring-1 ring-black/8 backdrop:bg-transparent',
)

/** Styled popover panel for a select or menu. Pair with `SSelectButton` or `HSelectRoot`. */
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
