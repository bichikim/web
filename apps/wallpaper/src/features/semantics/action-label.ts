import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from './types'
import {actionName} from './action-name'

export const actionLabel = (
  target: SemanticAction,
  actions: readonly CharacterAction[] = [],
): string =>
  actionName(
    target,
    actions.find((item) => item.action.kind === target.kind && item.action.id === target.id)?.label,
  )
