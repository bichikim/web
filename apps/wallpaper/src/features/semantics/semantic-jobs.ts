import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {SemanticInput} from '@winter-love/wallpaper/settings/semantics'

/** Snapshots the reactive inputs that invalidate a widget's pending semantic result. */
export const semanticJobs = (
  widgets: readonly PoffoWidget[],
  inputs: ReadonlyMap<string, SemanticInput>,
) =>
  widgets.map((widget) => {
    const input = inputs.get(widget.id) ?? {text: '', widgetId: widget.id}
    const bindings =
      widget.speech?.semanticBindings
        ?.filter((binding) => binding.category !== 'menu')
        .map((binding) => ({...binding})) ?? []
    const randomActions = widget.speech?.randomActions
    return {id: widget.id, input, signature: JSON.stringify([input, bindings, randomActions])}
  })
