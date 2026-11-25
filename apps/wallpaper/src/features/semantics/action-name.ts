import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'
import names from './action-names.json'

const catalogs = {
  expression: new Map(Object.entries(names.expression)),
  motion: new Map(Object.entries(names.motion)),
}
const namedMotions = new Map(
  Object.entries(names.namedMotions).map(([id, labels]) => [id, new Map(Object.entries(labels))]),
)

/** Translates known builtin labels while retaining authored custom names. */
export const actionName = (action: SemanticAction, name = action.id): string =>
  name === action.id
    ? (catalogs[action.kind].get(action.id) ?? name)
    : action.kind === 'motion'
      ? (namedMotions.get(action.id)?.get(name) ?? name)
      : name
