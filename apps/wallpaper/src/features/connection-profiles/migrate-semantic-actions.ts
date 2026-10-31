import {semanticActionSchema, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import ashActions from './ash-actions.json'

const actions = new Map(
  Object.entries(ashActions).map(([id, action]) => [id, semanticActionSchema.parse(action)]),
)
const ids = [...actions.keys()].toSorted((first, second) => second.length - first.length)

/** Converts known Ash connections to character presets, preserving custom text and unknown mappings. */
export const migrateSemanticActions = (
  bindings: readonly SemanticBinding[],
): readonly SemanticBinding[] => {
  const seen = new Set<string>()
  let changed = false
  const result = bindings.flatMap((binding) => {
    const key = ids.find((id) => binding.id === id || binding.id.startsWith(`${id}-`))
    const action = key === undefined ? undefined : actions.get(key)
    if (binding.action !== undefined || action === undefined) {
      return [binding]
    }
    changed = true
    const identity = JSON.stringify([
      action,
      binding.text,
      binding.excludeText,
      binding.threshold,
      binding.enabled,
    ])
    if (seen.has(identity)) {
      return []
    }
    seen.add(identity)
    return [{...binding, action, parameterId: null}]
  })
  return changed ? result : bindings
}
