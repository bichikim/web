import {writePsd} from 'ag-psd'
import {expect, test} from 'vitest'
import type {ImportPsdResult} from '../../src/editor/import-psd'

const importThroughWorker = async (file: File): Promise<ImportPsdResult> => {
  const worker = new Worker(
    new URL('../../src/editor/internal/import-psd-worker.ts', import.meta.url),
    {
      type: 'module',
    },
  )
  const result = new Promise<ImportPsdResult>((resolve, reject) => {
    worker.addEventListener(
      'message',
      (event: MessageEvent<ImportPsdResult>) => resolve(event.data),
      {once: true},
    )
    worker.addEventListener('error', (event) => reject(new Error(event.message)), {once: true})
    worker.addEventListener(
      'messageerror',
      () => reject(new Error('PSD Worker response could not be decoded')),
      {once: true},
    )
    worker.postMessage(file)
  })
  try {
    return await result
  } finally {
    worker.terminate()
  }
}

test('should import real PSD layer and mask pixels through the OffscreenCanvas worker boundary', async () => {
  const bytes = writePsd(
    {
      children: [
        {
          imageData: {
            data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
            height: 1,
            width: 2,
          },
          left: 1,
          mask: {
            defaultColor: 0,
            imageData: {data: new Uint8ClampedArray([128, 128, 128, 255]), height: 1, width: 1},
            left: 2,
            top: 1,
          },
          name: '눈',
          top: 1,
        },
      ],
      height: 3,
      width: 4,
    },
    {noBackground: true},
  )
  const result = await importThroughWorker(new File([bytes], 'model.psd'))
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(`PSD import failed: ${result.error.code}`)
  }
  expect(result.document.viewport).toEqual({height: 3, width: 4})
  expect(result.document.scene?.roots[0]?.name).toBe('눈')
  const part = result.document.parts[0]!
  expect(Math.min(...part.mesh.vertices.filter((_, index) => index % 2 === 0))).toBe(2)
  expect(Math.min(...part.mesh.vertices.filter((_, index) => index % 2 !== 0))).toBe(1)
  expect(part.psdSource).toMatchObject({fileName: 'model.psd', height: 1, width: 2, x: 1, y: 1})
  expect(part.texture).toMatchObject({height: 1, width: 2})
  const bitmap = await createImageBitmap(await (await fetch(part.texture.src)).blob())
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    expect(pixels[3]).toBe(0)
    expect(pixels.slice(4, 8)).toEqual(new Uint8ClampedArray([0, 0, 255, 128]))
  } finally {
    bitmap.close()
  }
})

test('should return a decode failure for damaged PSD bytes in the worker', async () => {
  expect(await importThroughWorker(new File(['8BPS broken'], 'broken.psd'))).toEqual({
    error: {code: 'decode-failed'},
    ok: false,
  })
})
