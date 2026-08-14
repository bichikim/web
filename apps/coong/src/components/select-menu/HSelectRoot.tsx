import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type ParentProps} from 'solid-js'

const DEFAULT_ANCHOR_GAP_PX = 8

export interface HSelectRootProps extends ParentProps {
  anchorGapPx?: number
  onOpenChange?: (isOpen: boolean) => void
}

/** Kobalte-backed root for menu/select-like primitives. */
export const HSelectRoot = (props: HSelectRootProps) => {
  return (
    <DropdownMenu
      gutter={props.anchorGapPx ?? DEFAULT_ANCHOR_GAP_PX}
      placement="bottom-start"
      onOpenChange={props.onOpenChange}
    >
      {props.children}
    </DropdownMenu>
  )
}
