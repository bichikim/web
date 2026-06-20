import {type ParentProps, untrack} from 'solid-js'
import {SelectMenuContext} from './context'
import {type UseSelectMenuProps, useSelectMenu} from './use-select-menu'

export interface HSelectRootProps extends ParentProps, UseSelectMenuProps {}

/** Root provider for headless select / menu primitives. */
export const HSelectRoot = (props: HSelectRootProps) => {
  const [menuProps, childrenProps] = splitSelectRootProps(props)
  const controller = useSelectMenu(untrack(() => menuProps))

  return (
    <SelectMenuContext.Provider value={{controller}}>
      {childrenProps.children}
    </SelectMenuContext.Provider>
  )
}

const splitSelectRootProps = (props: HSelectRootProps) => {
  const {
    anchorGapPx,
    children,
    focusOnOpen,
    listWidthPx,
    onAnchorRectChange,
    onOpenChange,
    viewportPaddingPx,
  } = props

  return [
    {
      anchorGapPx,
      focusOnOpen,
      listWidthPx,
      onAnchorRectChange,
      onOpenChange,
      viewportPaddingPx,
    },
    {children},
  ] as const
}
