import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'
import {createEffect} from 'solid-js'

export interface WaitSource<Options extends Record<string, any>> {
  cancel: () => void
  create?: (callback: (...args: any) => void, wait: number, options?: Partial<Options>) => void
  execute: (args: any, callback: (...args: any) => void, wait: number, options?: Partial<Options>) => void
  /**
   * stop wait and call callback function
   * @param callback
   */
  flush: (callback: (...args: any) => void) => void
}

export type WaitCreator<Options extends Record<string, any>> = () => WaitSource<Options>

export interface WaitReturn<Args extends any[]> {
  cancel: () => void
  execute: (...args: Args) => void
  flush: () => void
}

export const createUseWait = <Options extends Record<string, any>>(creator: WaitCreator<Options>) => {
  return <Args extends any[]>(
    callback: (...args: Args) => void,
    wait: MaybeAccessor<number>,
    options: MaybeAccessor<Partial<Options>> = {},
  ): WaitReturn<Args> => {
    const source = creator()
    const waitAccessor = resolveAccessor(wait)
    const optionsAccessor = resolveAccessor(options)

    createEffect(() => {
      const wait = waitAccessor()
      const options = optionsAccessor()

      source.create?.(callback, wait, options)

      return () => {
        source.cancel()
      }
    })

    return {
      cancel: () => {
        source.cancel()
      },
      execute: (...args: Args) => {
        source.execute(args, callback, waitAccessor())
      },
      flush: () => {
        source.flush(callback)
      },
    }
  }
}
