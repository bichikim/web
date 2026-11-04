import type {MotionPlayback} from '../playback/types'
import type {Player} from '../player-types'

interface CreateBufferedPlayerOptions {
  /** Validates commands and retains desired controls locally. */
  readonly player: Player
  /** Captures the control snapshot before a mutation. */
  readonly beforeChange: (command: string) => void
  /** Coalesces changed controls, including partial changes before a thrown command. */
  readonly afterChange: (command: string, accepted: boolean) => void
  /** Disposes the owned Worker and host resources, idempotently. */
  readonly destroy: () => void
}
const DIRECT_METHODS = new Set<PropertyKey>([
  'getExpression',
  'getParameterValue',
  'getParameterValues',
  'getRenderingInfo',
  'hitTest',
  'configureRenderer',
  'redraw',
  'resize',
  'setFit',
  'startMotion',
])

/** Sends top-level and independent-motion controls through the same versioned input boundary. */
export const createBufferedPlayer = (options: CreateBufferedPlayerOptions): Player => {
  const execute = <T>(name: string, command: () => T): T => {
    options.beforeChange(name)
    let accepted = false
    try {
      const result = command()
      accepted = result !== false
      return result
    } finally {
      options.afterChange(name, accepted)
    }
  }
  const wrapPlayback = (handle: MotionPlayback): MotionPlayback => {
    const result = {...handle}
    for (const key of Object.keys(handle)) {
      const operation: unknown = Reflect.get(handle, key)
      if (key !== 'getState' && typeof operation === 'function') {
        Reflect.set(result, key, (...args: unknown[]) =>
          execute(`motion.${handle.id}.${key}`, () => Reflect.apply(operation, handle, args)),
        )
      }
    }
    return result
  }
  const player: Player = {...options.player}
  for (const key of Object.keys(player)) {
    const operation: unknown = Reflect.get(player, key)
    if (typeof operation === 'function' && !DIRECT_METHODS.has(key)) {
      Reflect.set(
        player,
        key,
        key === 'destroy'
          ? options.destroy
          : (...args: unknown[]) =>
              execute(key, () => Reflect.apply(operation, options.player, args)),
      )
    }
  }
  player.startMotion = (motionId, settings) => {
    const handle = execute('startMotion', () => options.player.startMotion(motionId, settings))
    return handle === undefined ? undefined : wrapPlayback(handle)
  }
  return player
}
