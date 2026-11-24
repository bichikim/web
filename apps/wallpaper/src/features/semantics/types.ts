import type {MotionPlayback, Player} from '@winter-love/puppet/player'
import type {SemanticAction} from '@winter-love/wallpaper/settings/semantics'

export interface SemanticSegment {
  readonly start: number
  readonly end: number
  readonly text: string
  readonly complete: boolean
}

export interface CharacterAction {
  readonly action: SemanticAction
  readonly label: string
  /** Channels affected by this behavior, used for ownership and motion-history release; omitted when unknown. */
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
