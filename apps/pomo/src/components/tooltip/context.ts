import {type Accessor, createContext, useContext} from 'solid-js'

export interface TooltipRequest {
  readonly owner: string
  readonly target: HTMLElement
  readonly text: Accessor<string>
}

export interface TooltipContext {
  readonly active: Accessor<TooltipRequest | undefined>
  readonly close: () => void
  readonly cancelClose: () => void
  readonly scheduleClose: () => void
  readonly supported: Accessor<boolean | undefined>
  readonly present: (request: TooltipRequest) => void
  readonly dismiss: (owner: string, immediate?: boolean) => void
}

export const tooltipContext = createContext<TooltipContext>()
export const useTooltip = () => useContext(tooltipContext)
