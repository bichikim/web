import {createSignal, type ParentProps} from 'solid-js'
import {SelectContext} from './context'

export interface HSelectRootProps extends ParentProps {
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Root provider for headless select primitives. */
export const HSelectRoot = (props: HSelectRootProps) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false)

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    props.onOpenChange?.(nextOpen)
  }

  return (
    <SelectContext.Provider value={{onOpenChange, open}}>{props.children}</SelectContext.Provider>
  )
}
