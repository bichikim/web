import type {SemanticBinding} from './semantics'
import {semanticTargets} from './semantic-targets'
import {activeMenuBindings} from './active-menu-bindings'
import {semanticGroup} from './semantic-group'

/** Toggles one registered bundle and clears other checked bundles in its group. */
export const toggleMenuAction = (
  bindings: readonly SemanticBinding[],
  id: string,
): readonly SemanticBinding[] => {
  const selected = bindings.find((binding) => binding.id === id)
  if (
    selected?.category !== 'menu' ||
    !selected.enabled ||
    semanticTargets(selected).length === 0
  ) {
    return bindings
  }
  const active = !activeMenuBindings(bindings).some((binding) => binding.id === id)
  return bindings.map((binding) => {
    if (binding.id === id) {
      return {...binding, menuActive: active}
    }
    return binding.category === 'menu' &&
      binding.menuActive &&
      semanticGroup(binding) === semanticGroup(selected)
      ? {...binding, menuActive: false}
      : binding
  })
}
