/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {FaceDetector, FaceLandmarker, PoseLandmarker} from '@mediapipe/tasks-vision'

vi.mock('@mediapipe/tasks-vision', () => ({
  FaceDetector: {createFromOptions: vi.fn()},
  FaceLandmarker: {createFromOptions: vi.fn()},
  PoseLandmarker: {createFromOptions: vi.fn()},
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.resetModules()
})

test('should initialize independent task loaders and report local head, eye and shoulder pose', async () => {
  const publish = vi.fn()
  vi.stubGlobal('postMessage', publish)
  const detect = vi.fn().mockReturnValue({
    detections: [{boundingBox: {height: 100, originX: 50, originY: 30, width: 100}}],
  })
  vi.mocked(FaceDetector.createFromOptions).mockResolvedValue({
    detectForVideo: detect,
  } as unknown as FaceDetector)
  const pose = vi.fn().mockReturnValue({
    faceBlendshapes: [{categories: []}],
    facialTransformationMatrixes: [{data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -60, 1]}],
  })
  vi.mocked(FaceLandmarker.createFromOptions).mockResolvedValue({
    detectForVideo: pose,
  } as unknown as FaceLandmarker)
  const landmarks = Array.from({length: 33}, () => ({visibility: 1, x: 0.5, y: 0.5, z: 0}))
  const worldLandmarks = landmarks.map((point) => ({...point}))
  worldLandmarks[11] = {visibility: 1, x: 0.2, y: -0.4, z: 0.1}
  worldLandmarks[12] = {visibility: 1, x: -0.2, y: -0.4, z: -0.1}
  vi.mocked(PoseLandmarker.createFromOptions).mockResolvedValue({
    detectForVideo: vi
      .fn()
      .mockReturnValue({landmarks: [landmarks], worldLandmarks: [worldLandmarks]}),
  } as unknown as PoseLandmarker)
  await import('../face-worker')
  window.onmessage?.(new MessageEvent('message', {data: {pose: true, type: 'start'}}))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  const detectorFiles = vi.mocked(FaceDetector.createFromOptions).mock.calls[0]![0]
  const poseFiles = vi.mocked(FaceLandmarker.createFromOptions).mock.calls[0]![0]
  expect(poseFiles.wasmLoaderPath).not.toBe(detectorFiles.wasmLoaderPath)
  expect(poseFiles.wasmBinaryPath).toBe(detectorFiles.wasmBinaryPath)
  const bodyFiles = vi.mocked(PoseLandmarker.createFromOptions).mock.calls[0]![0]
  expect(
    new Set([bodyFiles.wasmLoaderPath, poseFiles.wasmLoaderPath, detectorFiles.wasmLoaderPath])
      .size,
  ).toBe(3)
  expect(publish).toHaveBeenCalledWith({type: 'ready'})
  const close = vi.fn()
  const bitmap = {close, height: 240, width: 320}
  window.onmessage?.(new MessageEvent('message', {data: {bitmap, timestamp: 100, type: 'frame'}}))
  expect(publish).toHaveBeenLastCalledWith({
    point: {
      body: {x: expect.closeTo(Math.atan2(0.2, 0.4) / (Math.PI / 6)), y: 0},
      detected: true,
      pose: {eyes: {x: 0, y: 0}, head: {x: 0, y: 0, z: 0}},
      x: 0.5625,
      y: 0.5,
    },
    type: 'point',
  })
  expect(close).toHaveBeenCalledOnce()
  detect.mockReturnValue({detections: []})
  window.onmessage?.(new MessageEvent('message', {data: {bitmap, timestamp: 200, type: 'frame'}}))
  expect(publish.mock.lastCall?.[0].point).toMatchObject({
    body: {x: expect.any(Number), y: 0},
    detected: false,
  })
})

test('should keep face-position mode free of head and body landmark inference', async () => {
  vi.stubGlobal('postMessage', vi.fn())
  vi.mocked(FaceDetector.createFromOptions).mockResolvedValue({
    detectForVideo: vi.fn().mockReturnValue({detections: []}),
  } as unknown as FaceDetector)
  await import('../face-worker')
  window.onmessage?.(new MessageEvent('message', {data: {pose: false, type: 'start'}}))
  await Promise.resolve()
  expect(FaceLandmarker.createFromOptions).not.toHaveBeenCalled()
  expect(PoseLandmarker.createFromOptions).not.toHaveBeenCalled()
})
