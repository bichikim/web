import {resolveAccessor} from 'src/resolve-accessor'
import {MayBeAccessor} from 'src/types'
import {onCleanup} from 'solid-js'

export interface LoopSource<Options extends Record<string, any>> {
  /**
   * start callback function in a loop sequence
   */
  start: (callback: (...args: any) => void, options: Partial<Options>) => void
  stop: (callback: (...args: any) => any, options: Partial<Options>) => void
}

export const createUseLoop = <Options extends Record<string, any>, Args extends any[]>(
  creator: () => LoopSource<Options>,
) => {
  return (
    callback: (...args: Args) => void,
    options: MayBeAccessor<Partial<Options>> = {},
  ) => {
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
