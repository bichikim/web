const MAXIMUM_TIMEOUT_MS = 2_147_483_647

export interface ReadAudioDurationOptions {
  readonly signal?: AbortSignal
  /** Optional elapsed-time deadline in milliseconds, from 0 through 2,147,483,647. */
  readonly timeoutMs?: number
}

/**
 * Reads raw seconds at the first metadata event; a media error returns null.
 * Abort rejects with signal.reason; a deadline rejects with a TimeoutError.
 * The first event, abort, deadline or setup failure wins, including during setup.
 * Every acquired release is attempted before returning. A lone failure rejects unchanged;
 * combined failures reject with AggregateError (primary rejection first and as cause).
 */
export const readAudioDuration = async (
  blob: Blob,
  options: ReadAudioDurationOptions = {},
): Promise<number | null> => {
  const {signal, timeoutMs} = options
  signal?.throwIfAborted()
  if (
    timeoutMs !== undefined &&
    (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAXIMUM_TIMEOUT_MS)
  ) {
    throw new RangeError('timeoutMs must be finite and between 0 and 2,147,483,647')
  }
  const subscriptions: (() => void)[] = []
  let audio: HTMLAudioElement | undefined
  let source: string | undefined
  let outcome: {value: number | null} | {error: unknown}
  try {
    outcome = {
      value: await new Promise<number | null>((resolve, reject) => {
        let settled = false
        const settle = (action: () => void) => {
          if (!settled) {
            settled = true
            action()
          }
        }
        const fail = (error: unknown) => settle(() => reject(error))
        const listen = (target: EventTarget, type: string, handler: EventListener) => {
          subscriptions.push(() => target.removeEventListener(type, handler))
          target.addEventListener(type, handler, {once: true})
        }
        try {
          if (signal !== undefined) {
            listen(signal, 'abort', () => fail(signal.reason))
            if (signal.aborted) {
              fail(signal.reason)
            }
          }
          if (settled) {
            return
          }
          if (timeoutMs !== undefined) {
            const timer = setTimeout(
              () => fail(new DOMException('Audio metadata deadline exceeded', 'TimeoutError')),
              timeoutMs,
            )
            subscriptions.push(() => clearTimeout(timer))
          }
          audio = globalThis.document.createElement('audio')
          if (settled) {
            return
          }
          source = URL.createObjectURL(blob)
          if (settled) {
            return
          }
          const media = audio
          media.preload = 'metadata'
          if (settled) {
            return
          }
          listen(media, 'loadedmetadata', () => {
            if (settled) {
              return
            }
            try {
              const {duration} = media
              settle(() => resolve(duration))
            } catch (error) {
              fail(error)
            }
          })
          if (settled) {
            return
          }
          listen(media, 'error', () => settle(() => resolve(null)))
          if (settled) {
            return
          }
          media.src = source
          if (settled) {
            return
          }
          media.load()
        } catch (error) {
          fail(error)
        }
      }),
    }
  } catch (error) {
    outcome = {error}
  }
  const cleanupErrors: unknown[] = []
  const releases = [
    ...subscriptions,
    () => audio?.removeAttribute('src'),
    () => {
      if (source !== undefined) {
        URL.revokeObjectURL(source)
      }
    },
  ]
  for (const release of releases) {
    try {
      release()
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  if (cleanupErrors.length > 0) {
    if ('error' in outcome) {
      throw new AggregateError([outcome.error, ...cleanupErrors], 'Audio read and cleanup failed', {
        cause: outcome.error,
      })
    }
    if (cleanupErrors.length === 1) {
      throw cleanupErrors[0]
    }
    throw new AggregateError(cleanupErrors, 'Audio metadata cleanup failed')
  }
  if ('error' in outcome) {
    throw outcome.error
  }
  return outcome.value
}
