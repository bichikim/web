import {FaceDetector} from '@mediapipe/tasks-vision'
import loader from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url'
import binary from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url'
import model from './assets/face-detector.tflite?url'
import {CAMERA_SENSITIVITY} from './types'

interface FaceFrame {
  readonly bitmap: ImageBitmap
  readonly timestamp: number
}

let detector: FaceDetector | null = null
const FRAME_CENTER = 0.5
const start = async () => {
  detector = await FaceDetector.createFromOptions(
    {
      wasmBinaryPath: new URL(binary, location.href).href,
      wasmLoaderPath: new URL(loader, location.href).href,
    },
    {
      baseOptions: {delegate: 'CPU', modelAssetPath: new URL(model, location.href).href},
      minDetectionConfidence: 0.65,
      runningMode: 'VIDEO',
    },
  )
  postMessage({type: 'ready'})
}
onmessage = (event: MessageEvent<FaceFrame>) => {
  const {bitmap, timestamp} = event.data
  try {
    if (detector === null) {
      throw new Error('Face detector is not ready')
    }
    const faces = detector.detectForVideo(bitmap, timestamp).detections
    const boxes = faces.flatMap((face) =>
      face.boundingBox === undefined ? [] : [face.boundingBox],
    )
    const face = boxes.reduce<(typeof boxes)[number] | null>(
      (largest, box) =>
        largest === null || box.width * box.height > largest.width * largest.height ? box : largest,
      null,
    )
    postMessage({
      point:
        face === null
          ? {detected: false, x: 0, y: 0}
          : {
              detected: true,
              x: Math.max(
                -1,
                Math.min(
                  1,
                  (FRAME_CENTER - (face.originX + face.width / 2) / bitmap.width) *
                    CAMERA_SENSITIVITY,
                ),
              ),
              y: Math.max(
                -1,
                Math.min(
                  1,
                  (FRAME_CENTER - (face.originY + face.height / 2) / bitmap.height) *
                    CAMERA_SENSITIVITY,
                ),
              ),
            },
      type: 'point',
    })
  } catch (cause) {
    postMessage({
      message: cause instanceof Error ? cause.message : 'Face detection failed',
      type: 'error',
    })
  } finally {
    bitmap.close()
  }
}
start().catch((cause: unknown) =>
  postMessage({
    message: cause instanceof Error ? cause.message : 'Face detector initialization failed',
    type: 'error',
  }),
)
