import {expect, it, onTestFinished} from 'vitest'

it('should load the packaged head, eye and body models and neutralize an empty camera frame', async () => {
  const worker = new Worker(
    new URL('../../src/features/tracking/face-worker.ts', import.meta.url),
    {type: 'module'},
  )
  onTestFinished(() => worker.terminate())
  const output = Promise.withResolvers<unknown>()
  worker.onerror = (event) => output.reject(new Error(event.message))
  worker.onmessage = async ({data}: MessageEvent) => {
    if (data.type === 'error') {
      output.reject(new Error(data.message))
    } else if (data.type === 'ready') {
      const bitmap = await createImageBitmap(new ImageData(480, 360))
      worker.postMessage({bitmap, timestamp: 1, type: 'frame'}, [bitmap])
    } else {
      output.resolve(data.point)
    }
  }
  worker.postMessage({pose: true, type: 'start'})
  await expect(output.promise).resolves.toMatchObject({body: null, detected: false})
}, 20_000)

it('should load the packaged face model and process an image without a camera', async () => {
  const worker = new Worker(
    new URL('../../src/features/tracking/face-worker.ts', import.meta.url),
    {type: 'module'},
  )
  onTestFinished(() => worker.terminate())
  const output = Promise.withResolvers<{readonly detected: boolean}>()
  worker.onerror = (event) => output.reject(new Error(event.message))
  worker.onmessage = async (event: MessageEvent) => {
    if (event.data.type === 'error') {
      output.reject(new Error(event.data.message))
    } else if (event.data.type === 'ready') {
      const bitmap = await createImageBitmap(new ImageData(64, 64))
      worker.postMessage({bitmap, timestamp: 1, type: 'frame'}, [bitmap])
    } else {
      output.resolve(event.data.point)
    }
  }
  worker.postMessage({pose: false, type: 'start'})
  await expect(output.promise).resolves.toMatchObject({detected: false})
}, 20_000)
