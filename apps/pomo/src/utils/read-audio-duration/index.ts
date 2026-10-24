const MAXIMUM_TIMEOUT_MS = 2_147_483_647

export interface ReadAudioDurationOptions {
  readonly signal?: AbortSignal
  /** 선택적으로 지정하는 제한 시간이며, 단위는 밀리초이고 범위는 0~2,147,483,647이다. */
  readonly timeoutMs?: number
}

/**
 * 첫 메타데이터 이벤트에서 초 단위 값을 그대로 읽는다. 미디어 오류가 발생하면 null을 반환한다.
 * 취소되면 signal.reason으로, 제한 시간을 넘기면 TimeoutError로 Promise를 거부한다.
 * 설정 중에도 이벤트, 취소, 제한 시간 초과, 설정 실패 중 먼저 발생한 결과를 적용한다.
 * 반환 전에 확보한 모든 자원의 해제를 시도한다. 실패가 하나면 원래 사유로 Promise를 거부한다.
 * 실패가 여러 개면 최초 거부 사유를 첫 항목과 cause로 담은 AggregateError로 거부한다.
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
