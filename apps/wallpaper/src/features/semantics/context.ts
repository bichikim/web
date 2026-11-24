import {type Accessor, createContext, useContext} from 'solid-js'
import type {AgentState} from '@winter-love/wallpaper/settings/agent-state'
export interface SemanticRuntime {
  readonly score: (widgetId: string, id: string) => number | undefined
  readonly busy: Accessor<boolean>
  readonly error: Accessor<string | null>
  readonly test: (widgetId: string, text: string) => void
  readonly preview: (widgetId: string, id: string | null) => void
  readonly previewing: (widgetId: string, id: string) => boolean
  /** Selects a transient state preview, or stops it with null; omitted when unsupported. */
  readonly previewAgent?: (widgetId: string, state: AgentState | null) => void
  /** Reports the widget's manually selected state; omitted when state previews are unsupported. */
  readonly previewingAgent?: (widgetId: string, state: AgentState) => boolean
}
export const SemanticContext = createContext<SemanticRuntime>()
export const useSemanticRuntime = () => useContext(SemanticContext)
