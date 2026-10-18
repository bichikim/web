import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {createFaceTracker} from './create-face-tracker'
import type {TrackingFrame, TrackingStatus, TrackingValues} from './types'

interface UseFaceTrackingProps {
  readonly video: Accessor<HTMLVideoElement | undefined>
  readonly onFrame: (frame: TrackingFrame) => void
}

const MILLISECONDS_PER_SECOND = 1000
export const useFaceTracking = (props: UseFaceTrackingProps) => {
  const [status, setStatus] = createSignal<TrackingStatus>('stopped')
  const [error, setError] = createSignal<string | null>(null)
  const [values, setValues] = createSignal<TrackingValues | null>(null)
  let stream: MediaStream | undefined
  let tracker: ReturnType<typeof createFaceTracker> | undefined
  let revision = 0
  let callback: number | undefined
  let video: HTMLVideoElement | undefined
  const stop = () => {
    revision += 1
    if (video !== undefined && callback !== undefined) {
      video.cancelVideoFrameCallback(callback)
    }
    callback = undefined
    tracker?.dispose()
    tracker = undefined
    stream?.getTracks().forEach((track) => track.stop())
    stream = undefined
    if (video !== undefined) {
      video.srcObject = null
    }
    setValues(null)
    setStatus('stopped')
    props.onFrame({timestamp: 0, values: null})
  }
  const fail = (message: string) => {
    stop()
    setError(message)
    setStatus('error')
  }
  const start = async () => {
    stop()
    setError(null)
    setStatus('starting')
    const generation = revision
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {facingMode: 'user', height: {ideal: 480}, width: {ideal: 640}},
      })
      if (generation !== revision) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      stream = media
      video = props.video()
      if (video === undefined) {
        throw new Error('카메라 미리보기를 준비하지 못했습니다.')
      }
      if (typeof video.requestVideoFrameCallback !== 'function') {
        throw new Error('이 브라우저는 카메라 프레임 추적을 지원하지 않습니다.')
      }
      video.srcObject = media
      await video.play()
      if (generation !== revision) {
        return
      }
      const nextFrame = (_time: number, metadata: VideoFrameCallbackMetadata) => {
        if (generation !== revision || video === undefined) {
          return
        }
        tracker
          ?.submit(video, metadata.mediaTime * MILLISECONDS_PER_SECOND)
          .catch((error: unknown) => fail(String(error)))
        callback = video.requestVideoFrameCallback(nextFrame)
      }
      tracker = createFaceTracker({
        onError: (message) => {
          if (generation === revision) {
            fail(message)
          }
        },
        onFrame: (frame) => {
          if (generation !== revision) {
            return
          }
          setValues(frame.values)
          setStatus(frame.values === null ? 'missing' : 'tracking')
          props.onFrame(frame)
        },
        onReady: () => {
          if (generation === revision && video !== undefined) {
            callback = video.requestVideoFrameCallback(nextFrame)
          }
        },
      })
      media.getTracks().forEach((track) => track.addEventListener('ended', stop, {once: true}))
    } catch (cause) {
      if (generation === revision) {
        fail(cause instanceof Error ? cause.message : '카메라를 시작하지 못했습니다.')
      }
    }
  }
  onCleanup(stop)
  return {dismissError: () => setError(null), error, start, status, stop, values}
}
