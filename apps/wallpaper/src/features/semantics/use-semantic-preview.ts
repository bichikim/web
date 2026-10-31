import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'

interface UseSemanticPreviewProps {
  /** Available widgets and connections; disabling or removing a connection stops its preview. */
  readonly widgets: Accessor<readonly PoffoWidget[]>
  /** Called after a widget's manual selection changes so its current frame can be republished. */
  readonly onChange: (widgetId: string) => void
}
export const useSemanticPreview = (props: UseSemanticPreviewProps) => {
  const [selections, setSelections] = createSignal<ReadonlyMap<string, string>>(new Map())
  const available = createMemo(
    () =>
      new Map(
        props
          .widgets()
          .map((widget) => [
            widget.id,
            new Set(
              widget.speech?.semanticBindings
                ?.filter((binding) => binding.enabled && binding.action !== undefined)
                .map((binding) => binding.id),
            ),
          ]),
      ),
  )
  const preview = (widgetId: string, id: string | null) => {
    const previous = selections()
    if (
      (id === null && !previous.has(widgetId)) ||
      (id !== null && !available().get(widgetId)?.has(id))
    ) {
      return
    }
    const next = new Map(previous)
    if (id === null) {
      next.delete(widgetId)
    } else {
      next.set(widgetId, id)
    }
    setSelections(next)
    props.onChange(widgetId)
  }
  createEffect(() => {
    const widgets = available()
    const selected = selections()
    for (const [widgetId, id] of selected) {
      if (!widgets.get(widgetId)?.has(id)) {
        untrack(() => preview(widgetId, null))
      }
    }
  })
  return {
    preview,
    previewing: (widgetId: string, id: string) => selections().get(widgetId) === id,
    selection: (widgetId: string) => selections().get(widgetId),
  }
}
