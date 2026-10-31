import {type Accessor, createContext, useContext} from 'solid-js'
export interface SemanticRuntime {
  readonly score: (widgetId: string, id: string) => number | undefined
  readonly busy: Accessor<boolean>
  readonly error: Accessor<string | null>
  readonly test: (widgetId: string, text: string) => void
}
export const SemanticContext = createContext<SemanticRuntime>()
export const useSemanticRuntime = () => useContext(SemanticContext)
