import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'

export interface CharacterAction {
  readonly action: SemanticAction
  readonly label: string
  /** Motion channels released on stop; omitted for expressions. */
  readonly parameterIds?: readonly string[]
}
