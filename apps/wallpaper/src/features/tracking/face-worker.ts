import {FaceDetector, FaceLandmarker, PoseLandmarker} from '@mediapipe/tasks-vision'
import loader from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url'
import binary from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url'
import {CAMERA_SENSITIVITY} from './types'
import {createFacePose} from './face-pose'
import {createBodyPose} from './body-pose'

interface FaceFrame {
  readonly type: 'frame'
  readonly bitmap: ImageBitmap
  readonly timestamp: number
}

interface FaceStart {
  readonly type: 'start'
  readonly pose: boolean
}

let detector: FaceDetector | null = null
let landmarker: FaceLandmarker | null = null
let body: PoseLandmarker | null = null
const FRAME_CENTER = 0.5
const start = async (pose: boolean) => {
  detector = await FaceDetector.createFromOptions(
    {
      wasmBinaryPath: new URL(binary, location.href).href,
      wasmLoaderPath: new URL(loader, location.href).href,
    },
    {
      baseOptions: {
        delegate: 'CPU',
        modelAssetPath: new URL('/tracking-runtime/face-detector.tflite', location.href).href,
      },
      minDetectionConfidence: 0.65,
      runningMode: 'VIDEO',
    },
  )
  if (pose) {
    // MediaPipe consumes the module factory; each task needs its own ES module instance.
    const poseLoader = new URL(loader, location.href)
    poseLoader.searchParams.set('task', 'face-landmarker')
    landmarker = await FaceLandmarker.createFromOptions(
      {
        wasmBinaryPath: new URL(binary, location.href).href,
        wasmLoaderPath: poseLoader.href,
      },
      {
        baseOptions: {
          delegate: 'CPU',
          modelAssetPath: new URL('/tracking-runtime/face-landmarker.task', location.href).href,
        },
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
      },
    )
    const bodyLoader = new URL(loader, location.href)
    bodyLoader.searchParams.set('task', 'pose-landmarker')
    body = await PoseLandmarker.createFromOptions(
      {
        wasmBinaryPath: new URL(binary, location.href).href,
        wasmLoaderPath: bodyLoader.href,
      },
      {
        baseOptions: {
          delegate: 'CPU',
          modelAssetPath: new URL('/tracking-runtime/pose-landmarker.task', location.href).href,
        },
        numPoses: 1,
        outputSegmentationMasks: false,
        runningMode: 'VIDEO',
      },
    )
  }
  postMessage({type: 'ready'})
}
const report = (cause: unknown) =>
  postMessage({
    message: cause instanceof Error ? cause.message : 'Face tracking failed',
    type: 'error',
  })

onmessage = (event: MessageEvent<FaceStart | FaceFrame>) => {
  if (event.data.type === 'start') {
    start(event.data.pose).catch(report)
    return
  }
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
    const tracked = landmarker?.detectForVideo(bitmap, timestamp)
    const shoulders = body?.detectForVideo(bitmap, timestamp)
    const torso =
      shoulders === undefined
        ? undefined
        : createBodyPose({
            landmarks: shoulders.landmarks[0] ?? [],
            world: shoulders.worldLandmarks[0] ?? [],
          })
    const pose =
      tracked === undefined
        ? undefined
        : createFacePose(
            tracked.facialTransformationMatrixes[0]?.data ?? [],
            tracked.faceBlendshapes[0]?.categories ?? [],
          )
    postMessage({
      point: {
        ...(torso === undefined ? {} : {body: torso}),
        ...(face === null
          ? {detected: false, x: 0, y: 0}
          : {
              detected: true,
              ...(pose === undefined ? {} : {pose}),
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
            }),
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
