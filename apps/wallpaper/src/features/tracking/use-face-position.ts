import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import type {FacePosition} from './types'

export const useFacePosition = (enabled: Accessor<boolean>) => {
  const [point, setPoint] = createSignal<FacePosition | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  createEffect(() => {
    setPoint(null)
    setError(null)
    if (!enabled() || !isTauri()) {
      return
    }
    let disposed = false
    let stop: (() => void) | null = null
    listen<FacePosition>('poffo-face', ({payload}) => {
      if (!disposed) {
        setPoint(payload.detected === false ? null : payload)
      }
    })
      .then((unlisten) => {
        if (disposed) {
          unlisten()
        } else {
          stop = unlisten
        }
      })
      .catch((cause: unknown) => {
        console.error('Poffo calibration listener failed', cause)
        if (!disposed) {
          setError('얼굴 기준을 읽지 못했어요.')
        }
      })
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
  return {error, point}
}
