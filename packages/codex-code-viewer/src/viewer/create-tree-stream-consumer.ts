import type {ScanBatch} from '../shared/contracts'
import {mergeScanBatches} from './merge-scan-batches'
import {nextAnimationFrame} from './next-animation-frame'

interface CreateTreeStreamConsumerOptions {
  readonly signal: AbortSignal
  readonly receive: (batches: readonly ScanBatch[]) => void
}
export interface TreeStreamConsumer {
  flush(): void
  receive(entry: ScanBatch): Promise<void>
}
interface FrameFailure {
  readonly error: Error
}
const FRAME_BUDGET_MS = 8
const MAX_QUEUED_ENTRIES = 4096

/** Delivers the first result immediately, then commits bounded groups between rendering opportunities. */
export const createTreeStreamConsumer = (
  options: CreateTreeStreamConsumerOptions,
): TreeStreamConsumer => {
  let first = true
  let deadline = Date.now()
  let queued: ScanBatch[] = []
  let entries = 0
  let frame: Promise<void> | null = null
  let failure: FrameFailure | null = null
  const flush = (): void => {
    if (failure !== null) {
      throw failure.error
    }
    if (!options.signal.aborted && queued.length > 0) {
      options.receive(mergeScanBatches(queued))
      first = false
    }
    queued = []
    entries = 0
  }
  const schedule = (): Promise<void> => {
    frame ??= nextAnimationFrame(options.signal)
      .then(() => {
        frame = null
        flush()
      })
      .catch((error: unknown) => {
        frame = null
        queued = []
        entries = 0
        if (!options.signal.aborted) {
          failure = {
            error:
              error instanceof Error ? error : new Error('Tree rendering failed', {cause: error}),
          }
        }
      })
    return frame
  }
  return {
    flush,
    receive: async (entry: ScanBatch): Promise<void> => {
      options.signal.throwIfAborted()
      if (failure !== null) {
        throw failure.error
      }
      if (queued.length === 0) {
        deadline = Date.now() + FRAME_BUDGET_MS
      }
      queued.push(entry)
      entries += entry.files.length + entry.directories.length
      const immediate = first || entries >= MAX_QUEUED_ENTRIES || Date.now() >= deadline
      const rendering = typeof globalThis.requestAnimationFrame === 'undefined' ? null : schedule()
      if (immediate) {
        flush()
        await rendering
        options.signal.throwIfAborted()
      }
    },
  }
}
