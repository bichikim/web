import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import {AGENT_STATES, type AgentState} from '@winter-love/wallpaper/settings/agent-state'

interface UseSemanticPreviewProps {
  /** Available widgets and connections; disabling or removing a connection stops its preview. */
  readonly widgets: Accessor<readonly PoffoWidget[]>
  /** Called after a widget's manual selection changes so its current frame can be republished. */
  readonly onChange: (widgetId: string) => void
}
type ManualSelection =
  | {readonly kind: 'semantic'; readonly id: string}
  | {readonly kind: 'agent'; readonly state: AgentState}
interface AvailableSelections {
  readonly semantic: ReadonlySet<string>
  readonly agent: ReadonlySet<AgentState>
}
const isAvailable = (available: AvailableSelections | undefined, selection: ManualSelection) =>
  selection.kind === 'semantic'
    ? available?.semantic.has(selection.id) === true
    : available?.agent.has(selection.state) === true

export const useSemanticPreview = (props: UseSemanticPreviewProps) => {
  const [selections, setSelections] = createSignal<ReadonlyMap<string, ManualSelection>>(new Map())
  const available = createMemo(
    () =>
      new Map(
        props.widgets().map((widget) => [
          widget.id,
          {
            agent: new Set(
              AGENT_STATES.filter(({value}) => {
                const binding = widget.speech?.agentBindings?.[value]
                return Boolean(binding?.parameterId || binding?.actions?.length)
              }).map(({value}) => value),
            ),
            semantic: new Set(
              widget.speech?.semanticBindings
                ?.filter((binding) => binding.enabled && semanticTargets(binding).length > 0)
                .map((binding) => binding.id),
            ),
          },
        ]),
      ),
  )
  const select = (widgetId: string, selection: ManualSelection | null) => {
    const previous = selections()
    if (
      (selection === null && !previous.has(widgetId)) ||
      (selection !== null && !isAvailable(available().get(widgetId), selection))
    ) {
      return
    }
    const next = new Map(previous)
    if (selection === null) {
      next.delete(widgetId)
    } else {
      next.set(widgetId, selection)
    }
    setSelections(next)
    untrack(() => props.onChange(widgetId))
  }
  const preview = (widgetId: string, id: string | null) => {
    if (id !== null || selections().get(widgetId)?.kind === 'semantic') {
      select(widgetId, id === null ? null : {id, kind: 'semantic'})
    }
  }
  const previewAgent = (widgetId: string, state: AgentState | null) => {
    if (state !== null || selections().get(widgetId)?.kind === 'agent') {
      select(widgetId, state === null ? null : {kind: 'agent', state})
    }
  }
  createEffect(() => {
    const widgets = available()
    const selected = selections()
    for (const [widgetId, selection] of selected) {
      if (!isAvailable(widgets.get(widgetId), selection)) {
        untrack(() => select(widgetId, null))
      }
    }
  })
  return {
    runtime: {
      preview,
      previewAgent,
      previewing: (widgetId: string, id: string) => {
        const selection = selections().get(widgetId)
        return selection?.kind === 'semantic' && selection.id === id
      },
      previewingAgent: (widgetId: string, state: AgentState) => {
        const selection = selections().get(widgetId)
        return selection?.kind === 'agent' && selection.state === state
      },
    },
    selection: (widgetId: string) => {
      const selection = selections().get(widgetId)
      return {
        agentPreview: selection?.kind === 'agent' ? selection.state : undefined,
        previewId: selection?.kind === 'semantic' ? selection.id : undefined,
      }
    },
  }
}
