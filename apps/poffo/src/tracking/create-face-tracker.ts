import type {TrackingFrame} from './types'

interface CreateFaceTrackerOptions {
  readonly onFrame: (frame: TrackingFrame) => void
  readonly onError: (message: string) => void
  readonly onReady: () => void
}
/** Starts a local classic worker with package-owned WASM assets and bounded frame delivery. */
export const createFaceTracker = (options: CreateFaceTrackerOptions) => {
  const worker = new Worker('/tracking/worker.js')
  let ready = false
  let busy = false
  let disposed = false
  const handleMessage = (
    event: MessageEvent<
      {type: 'ready'} | {type: 'frame'; frame: TrackingFrame} | {type: 'error'; message: string}
    >,
  ) => {
    const message = event.data
    switch (message.type) {
      case 'ready':
        ready = true
        options.onReady()
        return
      case 'frame':
        busy = false
        options.onFrame(message.frame)
        break
      case 'error':
        busy = false
        options.onError(message.message)
        break
      default: {
        const exhaustive: never = message
        return exhaustive
      }
    }
  }
  const handleError = (event: ErrorEvent) =>
    options.onError(event.message || '추적 Worker를 시작하지 못했습니다.')
  worker.addEventListener('message', handleMessage)
  worker.addEventListener('error', handleError)
  const initialize = async () => {
    const {FilesetResolver} = await import('@mediapipe/tasks-vision')
    const simd = await FilesetResolver.isSimdSupported()
    if (!disposed) {
      worker.postMessage({
        simd,
        type: 'initialize',
      })
    }
  }
  initialize().catch((error: unknown) => {
    if (!disposed) {
      options.onError(error instanceof Error ? error.message : '추적 모델을 불러오지 못했습니다.')
    }
  })
  return {
    dispose: () => {
      disposed = true
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    },
    submit: async (video: HTMLVideoElement, timestamp: number) => {
      if (!ready || busy || disposed || video.readyState < 2) {
        return
      }
      busy = true
      let image: ImageBitmap | undefined
      try {
        image = await createImageBitmap(video)
        if (disposed) {
          image.close()
          return
        }
        worker.postMessage({image, timestamp, type: 'frame'}, [image])
        image = undefined
      } catch (error) {
        image?.close()
        busy = false
        if (!disposed) {
          options.onError(error instanceof Error ? error.message : '영상 프레임을 읽지 못했습니다.')
        }
      }
    },
  }
}
