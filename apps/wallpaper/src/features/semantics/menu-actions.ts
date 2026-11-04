import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {activeMenuBindings} from '@winter-love/wallpaper/settings/active-menu-bindings'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import type {ContextAction} from './types'

export const menuActions = (bindings: readonly SemanticBinding[]): readonly ContextAction[] => {
  const checked = new Set(activeMenuBindings(bindings).map((binding) => binding.id))
  return bindings
    .filter(
      (binding) =>
        binding.enabled && binding.category === 'menu' && semanticTargets(binding).length > 0,
    )
    .map((binding) => ({
      checked: checked.has(binding.id),
      id: binding.id,
      label:
        binding.menuLabel?.trim() ||
        semanticTargets(binding)
          .map((action) => action.id)
          .join(' + '),
    }))
}
