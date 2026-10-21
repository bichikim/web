import type {FacePosition} from './types'

interface CreateCameraSessionOptions {
  readonly video: HTMLVideoElement
  readonly onPoint: (point: FacePosition) => void
  readonly onError: (cause: unknown) => void
}
interface FaceMessage {
  readonly type: 'ready' | 'point' | 'error'
  readonly point?: FacePosition
  readonly message?: string
}
interface CameraSession {
  readonly stop: () => void
  readonly update: () => void
}
const DETECTION_MILLISECONDS = 100

/** Starts local face detection and releases camera access on cancellation or failure. */
export const createCameraSession = (options: CreateCameraSessionOptions): CameraSession => {
  const worker = new Worker(new URL('./face-worker.ts', import.meta.url), {type: 'module'})
  let stream: MediaStream | null = null
  let stopped = false
  let ready = false
  let busy = false
  let callback = 0
  let previous = -Infinity
  const started = Date.now()
  const stop = () => {
    if (stopped) {
      return
    }
    stopped = true
    options.video.cancelVideoFrameCallback?.(callback)
    worker.terminate()
    stream?.getTracks().forEach((track) => {
      track.removeEventListener('ended', ended)
      track.stop()
    })
    options.video.pause()
    options.video.srcObject = null
    options.onPoint({detected: false, x: 0, y: 0})
  }
  const fail = (cause: unknown) => {
    if (!stopped) {
      stop()
      options.onError(cause)
    }
  }
  const ended = () => fail(new Error('Camera disconnected'))
  const update = () => {
    if (stopped) {
      return
    }
    const timestamp = Date.now() - started
    if (!ready || busy || timestamp - previous < DETECTION_MILLISECONDS) {
      return
    }
    busy = true
    previous = timestamp
    createImageBitmap(options.video, {resizeHeight: 240, resizeQuality: 'low', resizeWidth: 320})
      .then((bitmap) => {
        if (stopped) {
          bitmap.close()
          return
        }
        worker.postMessage({bitmap, timestamp}, [bitmap])
      })
      .catch(fail)
  }
  const frame = () => {
    if (stopped) {
      return
    }
    update()
    callback = options.video.requestVideoFrameCallback?.(frame) ?? 0
  }
  worker.onmessage = ({data}: MessageEvent<FaceMessage>) => {
    if (stopped) {
      return
    }
    switch (data.type) {
      case 'ready':
        ready = true
        break
      case 'point':
        busy = false
        if (data.point !== undefined) {
          options.onPoint(data.point)
        }
        break
      case 'error':
        fail(new Error(data.message))
        break
    }
  }
  worker.onerror = fail
  const start = async () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      throw new Error('Camera capture is unavailable')
    }
    const acquired = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {frameRate: {ideal: 15, max: 15}, height: {ideal: 480}, width: {ideal: 640}},
    })
    if (stopped) {
      acquired.getTracks().forEach((track) => track.stop())
      return
    }
    stream = acquired
    stream.getVideoTracks().forEach((track) => track.addEventListener('ended', ended, {once: true}))
    options.video.srcObject = stream
    await options.video.play()
    if (!stopped) {
      callback = options.video.requestVideoFrameCallback?.(frame) ?? 0
    }
  }
  start().catch(fail)
  return {stop, update}
}
