import {withAbort} from '../with-abort'
import type {NativeLocation, NativeOptions} from './types'

/** Collects result consumer completions for an individual native request. */
export const createResultDelivery = (receive: NativeOptions['receive']) => {
  const pending: Promise<PromiseSettledResult<unknown>>[] = []
  return {
    drain: async (signal?: AbortSignal): Promise<void> => {
      const results = await withAbort(Promise.all(pending), signal)
      const failed = results.find((result) => result.status === 'rejected')
      if (failed?.status === 'rejected') {
        throw failed.reason
      }
    },
    publish: (locations: readonly NativeLocation[]): void => {
      pending.push(
        Promise.resolve()
          .then(() => receive(locations))
          .then(
            (value) => ({status: 'fulfilled', value}) as const,
            (reason: unknown) => ({reason, status: 'rejected'}) as const,
          ),
      )
    },
  }
}
