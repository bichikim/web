import {type Accessor, createContext, useContext} from 'solid-js'

export interface TooltipContext {
  readonly anchor: string
  readonly id: string
  readonly isOpen: Accessor<boolean>
  readonly supported: Accessor<boolean | undefined>
  readonly close: () => void
  readonly cancelClose: () => void
  readonly scheduleClose: () => void
  readonly open: (source: HTMLElement, immediate: boolean) => void
}

export const tooltipContext = createContext<TooltipContext>()

export const useTooltip = (): TooltipContext => {
  const context = useContext(tooltipContext)
  if (context === undefined) {
    throw new Error('Tooltip.Trigger and Tooltip.Content require Tooltip.Root.')
  }
  return context
}
