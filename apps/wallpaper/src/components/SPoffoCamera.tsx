import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {emit} from '@tauri-apps/api/event'
import {isTauri} from '@tauri-apps/api/core'
import {createCameraSession} from '../features/tracking/create-camera-session'
import type {FacePosition} from '../features/tracking/types'

interface SPoffoCameraProps {
  readonly enabled: Accessor<boolean>
  readonly onError: (cause: unknown) => void
}
export const SPoffoCamera = (props: SPoffoCameraProps) => {
  const [video, setVideo] = createSignal<HTMLVideoElement | null>(null)
  let update: (() => void) | null = null
  const handleTime = () => update?.()
  createEffect(() => {
    const element = video()
    if (!props.enabled() || element === null) {
      return
    }
    const publish = (point: FacePosition) => {
      if (isTauri()) {
        emit('poffo-face', point).catch((cause: unknown) => untrack(() => props.onError(cause)))
      }
    }
    try {
      const {stop, update: sample} = createCameraSession({
        onError: (cause) => props.onError(cause),
        onPoint: publish,
        video: element,
      })
      update = sample
      onCleanup(() => {
        update = null
        stop()
      })
    } catch (cause) {
      props.onError(cause)
    }
  })
  return (
    <video
      ref={setVideo}
      muted
      playsinline
      onTimeUpdate={handleTime}
      aria-hidden="true"
      class="pointer-events-none fixed h-px w-px opacity-0"
    />
  )
}
