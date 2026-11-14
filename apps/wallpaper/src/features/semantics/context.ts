import {type Accessor, createContext, useContext} from 'solid-js'
export interface SemanticRuntime {
  readonly score: (widgetId: string, id: string) => number | undefined
  readonly busy: Accessor<boolean>
  readonly error: Accessor<string | null>
  readonly test: (widgetId: string, text: string) => void
  readonly preview: (widgetId: string, id: string | null) => void
  readonly previewing: (widgetId: string, id: string) => boolean
}
export const SemanticContext = createContext<SemanticRuntime>()
export const useSemanticRuntime = () => useContext(SemanticContext)
