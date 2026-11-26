import {type Accessor, createEffect} from 'solid-js'
import type {Player} from '../player'
interface PlayerMotionOptions {
  /** The current renderer-owned player; this hook never destroys it. */
  readonly player: Accessor<Player | null>
  /** Requested motion; undefined leaves the current playback position intact. */
  readonly motionId: Accessor<string | undefined>
}
/** Changes motion only for a new player or a different requested motion. */
export const usePlayerMotion = (options: PlayerMotionOptions) => {
  let appliedPlayer: Player | null = null
  let appliedMotion: string | undefined
  createEffect(
    () => ({motionId: options.motionId(), player: options.player()}),
    ({player, motionId}) => {
      if (
        player !== null &&
        motionId !== undefined &&
        (player !== appliedPlayer || motionId !== appliedMotion)
      ) {
        player.setMotion(motionId)
        appliedPlayer = player
        appliedMotion = motionId
      }
    },
  )
}
