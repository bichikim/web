import type {SemanticBinding} from './semantics'
import {semanticTargets} from './semantic-targets'
import {semanticGroup} from './semantic-group'

/** Resolves checked menu bundles in declaration order, keeping one per group. */
export const activeMenuBindings = (
  bindings: readonly SemanticBinding[],
): readonly SemanticBinding[] => {
  const groups = new Set<string>()
  return bindings.filter((binding) => {
    const group = semanticGroup(binding)
    if (
      binding.enabled &&
      binding.category === 'menu' &&
      binding.menuActive &&
      semanticTargets(binding).length > 0 &&
      !groups.has(group)
    ) {
      groups.add(group)
      return true
    }
    return false
  })
}
