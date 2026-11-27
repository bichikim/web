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

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {promise, resolve}
}

const mockClient = () => {
  const client = {
    cancelAlpha: vi.fn(),
    connectGeometry: vi.fn(),
    destroy: vi.fn(),
    draw: vi.fn(),
    initialize: vi.fn(),
    releaseGeometry: vi.fn(),
    uploadTextures: vi.fn(),
  }
  vi.mocked(createGpuClient).mockReturnValue(client)
  return client
}

const documentWithTextures = (...ids: string[]) => ({
  ...createEmptyDocument(),
  parts: ids.map((id) => ({
    id,
    mesh: {indices: [], uvs: [], vertices: []},
    texture: {height: 1, src: id, width: 1},
  })),
})

test('should skip texture preparation and leave the canvas available when WebGPU fails to initialize', async () => {
  const client = mockClient()
  const failure = new Error('No suitable graphics adapter found')
  client.initialize.mockRejectedValue(failure)
  vi.mocked(loadTextureImage).mockResolvedValue(new Image())
  const createBitmap = vi.fn()
  vi.stubGlobal('createImageBitmap', createBitmap)
  const canvas = document.createElement('canvas')
  const getContext = vi.spyOn(canvas, 'getContext')

  await expect(
    createGpuResources({canvas, document: documentWithTextures('atlas')}, {height: 16, width: 16}),
  ).rejects.toBe(failure)

  expect(loadTextureImage).not.toHaveBeenCalled()
  expect(createBitmap).not.toHaveBeenCalled()
  expect(client.uploadTextures).not.toHaveBeenCalled()
  expect(getContext).not.toHaveBeenCalled()
  expect(client.destroy).toHaveBeenCalledOnce()
})

test('should decode only after WebGPU initializes and present only after texture upload finishes', async () => {
  const client = mockClient()
  const initialized = deferred<void>()
  const uploading = deferred<void>()
  const uploaded = deferred<void>()
  client.initialize.mockReturnValue(initialized.promise)
  client.uploadTextures.mockImplementation(() => {
    uploading.resolve()
    return uploaded.promise
  })
  const image = new Image()
  const bitmap = {close: vi.fn(), height: 1, width: 1} satisfies ImageBitmap
  const createBitmap = vi.fn().mockResolvedValue(bitmap)
  vi.stubGlobal('createImageBitmap', createBitmap)
  vi.mocked(loadTextureImage).mockResolvedValue(image)
  const canvas = document.createElement('canvas')
  const context = {canvas, transferFromImageBitmap: vi.fn()} satisfies ImageBitmapRenderingContext
  const getContext = vi.fn(() => context)
  Object.assign(canvas, {getContext})

  const resources = createGpuResources(
    {canvas, document: documentWithTextures('atlas', 'atlas')},
    {height: 16, width: 16},
  )
  expect(client.initialize).toHaveBeenCalledOnce()
  expect(loadTextureImage).not.toHaveBeenCalled()
  initialized.resolve()
  await uploading.promise
  expect(vi.mocked(loadTextureImage).mock.calls.map(([source]) => source)).toEqual(['atlas'])
  expect(createBitmap).toHaveBeenCalledExactlyOnceWith(image)
  expect(client.uploadTextures).toHaveBeenCalledExactlyOnceWith([bitmap])
  expect(getContext).not.toHaveBeenCalled()
  uploaded.resolve()
  await expect(resources).resolves.toEqual({client, context, images: new Map([['atlas', image]])})
  expect(getContext).toHaveBeenCalledExactlyOnceWith('bitmaprenderer')
})

test('should close a bitmap that finishes after another texture conversion fails', async () => {
  const failure = new Error('Bitmap cannot be converted')
  const bitmap = {close: vi.fn(), height: 1, width: 1} satisfies ImageBitmap
  const started = deferred<void>()
  const decoded = deferred<ImageBitmap>()
  vi.stubGlobal(
    'createImageBitmap',
    vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(() => {
        started.resolve()
        return decoded.promise
      }),
  )
  vi.mocked(loadTextureImage).mockImplementation(async () => new Image())
  const client = mockClient()
  const result = createGpuResources(
    {
      canvas: document.createElement('canvas'),
      document: documentWithTextures('first', 'second'),
    },
    {height: 16, width: 16},
  )
  const rejected = expect(result).rejects.toBe(failure)
  await started.promise
  await rejected
  decoded.resolve(bitmap)
  await decoded.promise
  expect(bitmap.close).toHaveBeenCalledOnce()
  expect(client.uploadTextures).not.toHaveBeenCalled()
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
