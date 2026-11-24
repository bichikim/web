/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../../create-empty-document'
import {loadTextureImage} from '../../../internal/load-texture-image'
import {createGpuClient} from '../create-client'
import {createGpuResources} from '../create-resources'

vi.mock('../create-client', () => ({createGpuClient: vi.fn()}))
vi.mock('../../../internal/load-texture-image', () => ({loadTextureImage: vi.fn()}))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

test('should close a bitmap that finishes after another texture conversion fails', async () => {
  const failure = new Error('Bitmap cannot be converted')
  const bitmap = {close: vi.fn(), height: 1, width: 1} satisfies ImageBitmap
  let start = () => {}
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  let complete = (_bitmap: ImageBitmap) => {}
  const decoded = new Promise<ImageBitmap>((resolve) => {
    complete = resolve
  })
  vi.stubGlobal(
    'createImageBitmap',
    vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(() => {
        start()
        return decoded
      }),
  )
  vi.mocked(loadTextureImage).mockImplementation(async () => new Image())
  const client = {
    cancelAlpha: vi.fn(),
    connectGeometry: vi.fn(),
    destroy: vi.fn(),
    draw: vi.fn(),
    initialize: vi.fn(),
    releaseGeometry: vi.fn(),
  }
  vi.mocked(createGpuClient).mockReturnValue(client)
  const result = createGpuResources(
    {
      canvas: document.createElement('canvas'),
      document: {
        ...createEmptyDocument(),
        parts: ['first', 'second'].map((id) => ({
          id,
          mesh: {indices: [], uvs: [], vertices: []},
          texture: {height: 1, src: id, width: 1},
        })),
      },
    },
    {height: 16, width: 16},
  )
  const rejected = expect(result).rejects.toBe(failure)
  await started
  await rejected
  complete(bitmap)
  await decoded
  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(client.initialize).not.toHaveBeenCalled()
  expect(client.destroy).toHaveBeenCalledOnce()
})

test('should reject a forced Worker Canvas when the canvas cannot be transferred', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'transferControlToOffscreen', {value: undefined})
  await expect(
    createGpuResources(
      {canvas, document: createEmptyDocument(), gpuPresentation: 'worker-canvas'},
      {height: 16, width: 16},
    ),
  ).rejects.toThrow('Worker Canvas presentation requires a transferable canvas')
  expect(createGpuClient).not.toHaveBeenCalled()
})

test('should reject a forced Worker Canvas when a main-thread render callback is configured', async () => {
  const transfer = vi.fn()
  const canvas = Object.assign(document.createElement('canvas'), {
    transferControlToOffscreen: transfer,
  })
  await expect(
    createGpuResources(
      {
        canvas,
        document: createEmptyDocument(),
        gpuPresentation: 'worker-canvas',
        onBeforeRender: vi.fn(),
      },
      {height: 16, width: 16},
    ),
  ).rejects.toThrow('Worker Canvas presentation does not support onBeforeRender')
  expect(transfer).not.toHaveBeenCalled()
})
