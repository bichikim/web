import type {MotionPlayback, Player} from '@winter-love/puppet/player'
import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'

export interface CharacterAction {
  readonly action: SemanticAction
  readonly label: string
  /** Motion channels released on stop; omitted for expressions. */
  readonly parameterIds?: readonly string[]
}

export interface SemanticSelection {
  readonly group: string
  readonly action: CharacterAction
}
export interface SemanticPlayer {
  readonly setExpressionLayer: Player['setExpressionLayer']
  readonly resetMotionHistory: Player['resetMotionHistory']
  readonly startMotion: (
    id: string,
    options: {readonly loop: boolean},
  ) => Pick<MotionPlayback, 'stop'> | undefined
}

export interface ContextAction {
  readonly id: string
  readonly label: string
  readonly checked: boolean
}
