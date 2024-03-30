import {resolveAccessor} from 'src/use/resolve-accessor'
import {MayBeAccessor} from 'src/use/types'
import {watch} from 'src/use/watch'

export interface WaitSource<Options extends Record<string, any>> {
  cancel: () => void
  create?: <Args extends any[]>(
    callback: (...args: Args) => void,
    wait: number,
    options?: Partial<Options>,
  ) => void
  execute: <Args extends any[]>(
    args: Args,
    callback: (...args: Args) => void,
    wait: number,
    options?: Partial<Options>,
  ) => void
}

export type WaitCreator<Options extends Record<string, any>> = () => WaitSource<Options>

export interface WaitReturn<Args extends any[]> {
  cancel: () => void
  execute: (...args: Args) => void
  flush: () => void
}

export const waitFactory = <Options extends Record<string, any>>(
  creator: WaitCreator<Options>,
) => {
  const source = creator()

  return <Args extends any[]>(
    callback: (...args: Args) => void,
    wait: MayBeAccessor<number>,
    options: MayBeAccessor<Partial<Options>> = {},
  ): WaitReturn<Args> => {
    const waitAccessor = resolveAccessor(wait)
    const optionsAccessor = resolveAccessor(options)

    watch(waitAccessor, (wait) => {
      source.create?.(callback, wait, optionsAccessor())
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
        // todo
      },
    }
  }
}
