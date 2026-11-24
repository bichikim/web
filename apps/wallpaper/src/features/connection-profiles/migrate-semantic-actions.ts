import {
  semanticActionSchema,
  type SemanticBinding,
  semanticBindingsSchema,
} from '@winter-love/wallpaper/settings/semantics'
import ashActions from './ash-actions.json'
import ash from './ash.json'
import previous from './legacy-bindings.json'
import revisions from './previous-bindings.json'
import names from './previous-names.json'
import previousExamples from './examples/ko.json'
import previousThresholds from './previous-thresholds.json'
import {migrateSemanticExamples} from './migrate-semantic-examples'

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
const groups = new Map(Object.entries(names.groups))
const menus = new Map(Object.entries(names.menus))
const examples = new Map(previousExamples.map((example) => [example.id, example]))
const thresholds = new Map(Object.entries(previousThresholds))

const translateExamples = (binding: SemanticBinding): SemanticBinding => {
  const previous = examples.get(binding.id)
  const replacement = defaults.get(binding.id)
  if (previous === undefined || replacement === undefined) {
    return binding
  }
  const text = binding.text === previous.text ? replacement.text : binding.text
  const excludeText =
    binding.excludeText === previous.excludeText ? replacement.excludeText : binding.excludeText
  const unchanged =
    (binding.text === previous.text || binding.text === replacement.text) &&
    (binding.excludeText === previous.excludeText ||
      binding.excludeText === replacement.excludeText)
  const threshold =
    unchanged && binding.threshold === thresholds.get(binding.id)
      ? replacement.threshold
      : binding.threshold
  return text === binding.text &&
    excludeText === binding.excludeText &&
    threshold === binding.threshold
    ? binding
    : {...binding, excludeText, text, threshold}
}

const renameDefault = (binding: SemanticBinding): SemanticBinding => {
  const group = groups.get(binding.exclusiveGroup ?? '') ?? binding.exclusiveGroup
  const menu =
    menus.get(binding.id) === binding.menuLabel
      ? (defaults.get(binding.id)?.menuLabel ?? binding.menuLabel)
      : binding.menuLabel
  if (group === binding.exclusiveGroup && menu === binding.menuLabel) {
    return binding
  }
  return {
    ...binding,
    ...(group === binding.exclusiveGroup ? {} : {exclusiveGroup: group}),
    ...(menu === binding.menuLabel ? {} : {menuLabel: menu}),
  }
}

const refreshDefault = (binding: SemanticBinding, key = binding.id): SemanticBinding => {
  const replacement = defaults.get(key)
  const originalAction = actions.get(key)
  if (
    binding.action !== undefined &&
    replacement !== undefined &&
    binding.action.id === originalAction?.id &&
    binding.action.kind === originalAction?.kind
  ) {
    const original =
      binding.examples === undefined
        ? legacy.find(
            (item) =>
              item.id === key &&
              item.text === binding.text &&
              item.excludeText === binding.excludeText &&
              (item.text !== replacement.text || item.excludeText !== replacement.excludeText),
          )
        : undefined
    const patch = {
      ...binding,
      ...(replacement.actions === undefined
        ? {}
        : {action: undefined, actions: replacement.actions}),
      category:
        original === undefined ? (binding.category ?? replacement.category) : replacement.category,
      exclusiveGroup:
        binding.exclusiveGroup ??
        (binding.category === undefined ? replacement.exclusiveGroup : undefined),
      ...(original === undefined
        ? {}
        : {
            excludeText: replacement.excludeText,
            ...(replacement.menuLabel === undefined
              ? {}
              : {menuLabel: binding.menuLabel ?? replacement.menuLabel}),
            text: replacement.text,
            threshold:
              binding.threshold === original.threshold ? replacement.threshold : binding.threshold,
          }),
    }
    const fields = [
      'action',
      'actions',
      'category',
      'exclusiveGroup',
      'text',
      'excludeText',
      'threshold',
      'menuLabel',
    ] as const
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
  const translated = result.map((binding) =>
    binding.examples === undefined
      ? migrateSemanticExamples(translateExamples(renameDefault(binding)))
      : binding,
  )
  return changed || translated.some((binding, index) => binding !== result[index])
    ? translated
    : bindings
}
