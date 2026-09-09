import Dexie, {type Table} from 'dexie'
import {sampleVideo, type VideoSample} from './sample'
export * from './sample'
export * from './timeline'

interface CachedVideo {
  readonly id: string
  readonly samples: readonly VideoSample[]
}
let table: Table<CachedVideo, string> | undefined
const storage = () => {
  if (table === undefined) {
    const database = new Dexie('pomo-video-background-v1')
    database.version(1).stores({samples: 'id'})
    table = database.table<CachedVideo, string>('samples')
  }
  return table
}
interface PendingVideo {
  readonly controller: AbortController
  readonly result: Promise<readonly VideoSample[] | null>
}
const pending = new Map<string, PendingVideo>()
let queue: Promise<unknown> = Promise.resolve()

/** Loads cached samples or queues one decoder; failure leaves the first-frame background usable. */
export const prepareVideoBackground = (
  id: string,
  blob: Blob,
): Promise<readonly VideoSample[] | null> => {
  const current = pending.get(id)
  if (current !== undefined) {
    return current.result
  }
  const controller = new AbortController()
  const result = queue
    .then(async () => {
      controller.signal.throwIfAborted()
      const cached = await storage().get(id)
      if (cached !== undefined) {
        return cached.samples
      }
      const samples = await sampleVideo(blob, controller.signal)
      controller.signal.throwIfAborted()
      await storage().put({id, samples})
      return samples
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.warn('Video background preparation failed; using first frame.', error)
      }
      return null
    })
    .finally(() => {
      pending.delete(id)
    })
  pending.set(id, {controller, result})
  queue = result
  return result
}

/** Cancels unfinished preparation and removes the derived cache after media deletion. */
export const removeVideoBackground = async (id: string): Promise<void> => {
  const current = pending.get(id)
  current?.controller.abort()
  await current?.result
  try {
    await storage().delete(id)
  } catch (error) {
    console.warn('Unable to remove video background cache.', error)
  }
}
