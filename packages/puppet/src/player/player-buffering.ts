import type {Player} from './player-types'
import type {BufferingController} from './buffering/create-buffering-controller'
import type {
  PlayerBufferingChange,
  PlayerBufferingConfiguration,
  PlayerBufferingInfo,
  PlayerInputChange,
} from './buffering/types'
export type {
  PlayerBufferingChange,
  PlayerBufferingConfiguration,
  PlayerBufferingInfo,
  PlayerInputChange,
  PlayerBufferingStatus,
} from './buffering/types'

// Library entry points are built independently but can receive the same Player instance.
const BUFFERING = Symbol.for('@winter-love/puppet/player-buffering')
const controllerOf = (player: Player & {readonly [BUFFERING]?: BufferingController}) =>
  player[BUFFERING]

/** Registers the buffering lifetime owned by createPlayer. */
export const registerPlayerBuffering = (player: Player, controller: BufferingController) => {
  Object.defineProperty(player, BUFFERING, {value: controller})
}

/**
 * Latest configuration wins. Resolves after configuration, not after its first displayed frame.
 * Commands validate and return acceptance synchronously; numerical application is asynchronous.
 * Getters and hitTest read the last displayed frame. Use flushPlayerInputs to await accepted input.
 * Missing Worker/animation APIs or a Worker failure use the native path; query status for ownership.
 */
export const configurePlayerBuffering = (
  player: Player,
  configuration: PlayerBufferingConfiguration,
): Promise<PlayerBufferingChange> =>
  controllerOf(player)?.configure(configuration) ?? Promise.resolve('unavailable')

/** Requested mode and actual state; foreign Player implementations remain supported without a buffer. */
export const getPlayerBufferingInfo = (player: Player): PlayerBufferingInfo =>
  controllerOf(player)?.info() ?? {enabled: false, framesAhead: 0, status: 'unsupported'}

/**
 * Waits for the latest accepted controls through this call to reach a submitted frame. Newer inputs
 * may replace earlier values. Document replacement resolves superseded; destruction resolves destroyed.
 * Hidden documents wait until visible. Native mode resolves applied immediately.
 */
export const flushPlayerInputs = (player: Player): Promise<PlayerInputChange> =>
  controllerOf(player)?.flush() ?? Promise.resolve('unavailable')
