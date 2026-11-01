import {
  semanticActionSchema,
  type SemanticBinding,
  semanticBindingsSchema,
} from '@winter-love/wallpaper/settings/semantics'
import ashActions from './ash-actions.json'
import ash from './ash.json'
import previous from './legacy-bindings.json'
import revisions from './previous-bindings.json'

const actions = new Map(
  Object.entries(ashActions).map(([id, action]) => [id, semanticActionSchema.parse(action)]),
)
const defaults = new Map(
  semanticBindingsSchema
    .parse(ash.connections.semanticBindings)
    .map((binding) => [binding.id, binding]),
)
const legacy = [
  ...semanticBindingsSchema.parse(previous),
  ...semanticBindingsSchema.parse(revisions),
]
const ids = [...actions.keys()].toSorted((first, second) => second.length - first.length)

const refreshDefault = (binding: SemanticBinding, key = binding.id): SemanticBinding => {
  const replacement = defaults.get(key)
  if (
    binding.action !== undefined &&
    replacement !== undefined &&
    binding.action.id === replacement.action?.id &&
    binding.action.kind === replacement.action?.kind
  ) {
    const original = legacy.find(
      (item) =>
        item.id === key &&
        item.text === binding.text &&
        item.excludeText === binding.excludeText &&
        (item.text !== replacement.text || item.excludeText !== replacement.excludeText),
    )
    const patch = {
      ...binding,
      category:
        original === undefined ? (binding.category ?? replacement.category) : replacement.category,
      exclusiveGroup:
        binding.exclusiveGroup ??
        (binding.category === undefined ? replacement.exclusiveGroup : undefined),
      ...(original === undefined
        ? {}
        : {
            excludeText: replacement.excludeText,
            text: replacement.text,
            threshold:
              binding.threshold === original.threshold ? replacement.threshold : binding.threshold,
          }),
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
    if (binding.actions !== undefined) {
      return [binding]
    }
    const key = ids.find((id) => binding.id === id || binding.id.startsWith(`${id}-`))
    const action = key === undefined ? undefined : actions.get(key)
    const replacement = key === undefined ? undefined : defaults.get(key)
    if (binding.action !== undefined) {
      const updated = refreshDefault(binding, key)
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
      refreshDefault(
        {
          ...binding,
          action,
          category: binding.category ?? replacement?.category,
          exclusiveGroup: binding.exclusiveGroup ?? replacement?.exclusiveGroup,
          parameterId: null,
        },
        key,
      ),
    ]
  })
  return changed ? result : bindings
}
