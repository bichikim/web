import {
  semanticActionSchema,
  type SemanticBinding,
  semanticBindingsSchema,
} from '@winter-love/wallpaper/settings/semantics'
import ashActions from './ash-actions.json'
import ash from './ash.json'
import previous from './legacy-bindings.json'

const actions = new Map(
  Object.entries(ashActions).map(([id, action]) => [id, semanticActionSchema.parse(action)]),
)
const defaults = new Map(
  semanticBindingsSchema
    .parse(ash.connections.semanticBindings)
    .map((binding) => [binding.id, binding]),
)
const legacy = new Map(
  semanticBindingsSchema.parse(previous).map((binding) => [binding.id, binding]),
)
const ids = [...actions.keys()].toSorted((first, second) => second.length - first.length)

const refreshDefault = (binding: SemanticBinding): SemanticBinding => {
  const replacement = defaults.get(binding.id)
  const original = legacy.get(binding.id)
  if (
    binding.action !== undefined &&
    replacement !== undefined &&
    binding.action.id === replacement.action?.id &&
    binding.action.kind === replacement.action?.kind
  ) {
    const unchanged =
      original !== undefined &&
      binding.text === original.text &&
      binding.excludeText === original.excludeText &&
      binding.threshold === original.threshold
    const patch = {
      ...binding,
      category: binding.category ?? replacement.category,
      exclusiveGroup:
        binding.exclusiveGroup ??
        (binding.category === undefined ? replacement.exclusiveGroup : undefined),
      ...(unchanged
        ? {
            excludeText: replacement.excludeText,
            text: replacement.text,
            threshold: replacement.threshold,
          }
        : {}),
    }
    const fields = ['category', 'exclusiveGroup', 'text', 'excludeText', 'threshold'] as const
    return fields.some((field) => patch[field] !== binding[field]) ? patch : binding
  }
  return binding
}

/** Migrates Ash presets and removes obsolete builtin outputs, preserving custom drafts and text. */
export const migrateSemanticActions = (
  bindings: readonly SemanticBinding[],
): readonly SemanticBinding[] => {
  const seen = new Set<string>()
  let changed = false
  const result = bindings.flatMap((binding) => {
    const key = ids.find((id) => binding.id === id || binding.id.startsWith(`${id}-`))
    const action = key === undefined ? undefined : actions.get(key)
    const replacement = key === undefined ? undefined : defaults.get(key)
    if (binding.action !== undefined) {
      const updated = refreshDefault(binding)
      changed ||= updated !== binding
      return [updated]
    }
    if (action === undefined) {
      if (binding.id.startsWith('ash:')) {
        changed = true
        return []
      }
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
    return [
      {
        ...binding,
        action,
        category: binding.category ?? replacement?.category,
        exclusiveGroup: binding.exclusiveGroup ?? replacement?.exclusiveGroup,
        parameterId: null,
      },
    ]
  })
  return changed ? result : bindings
}
