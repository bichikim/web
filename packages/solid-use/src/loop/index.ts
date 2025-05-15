import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'
import {onCleanup} from 'solid-js'

export interface LoopSource<Options extends Record<string, any>> {
  /**
   * start callback function in a loop sequence
   */
  start: (callback: (...args: any) => void, options: Partial<Options>) => void
  stop: (callback: (...args: any) => any, options: Partial<Options>) => void
}

/**
 * create a loop hook such as useInterval, useAnimationFrame, etc.
 */
export const createUseLoop = <Options extends Record<string, any>, Args extends any[]>(
  creator: () => LoopSource<Options>,
) => {
  return (callback: (...args: Args) => void, options: MaybeAccessor<Partial<Options>> = {}) => {
    const source = creator()
    const resolveOptions = resolveAccessor(options)

    const stop = () => {
      source.stop(callback, resolveOptions())
    }

    onCleanup(() => {
      stop()
    })

    return {
      start: () => {
        source.start(callback, resolveOptions())
      },
      stop,
    }
  }
}
