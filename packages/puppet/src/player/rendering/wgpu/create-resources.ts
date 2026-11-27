import {limitAsync} from 'es-toolkit/promise'
import type {CreatePlayerRendererOptions} from '../create-player-renderer'
import {describeMeshes} from './describe-meshes'
import {loadTextureImage} from '../../internal/load-texture-image'
import {createGpuClient} from './create-client'

const convertTextures = (images: readonly HTMLImageElement[]): Promise<ImageBitmap[]> => {
  const owned: ImageBitmap[] = []
  let failed = false
  return Promise.all(
    images.map(async (image) => {
      const texture = await createImageBitmap(image)
      if (failed) {
        texture.close()
      } else {
        owned.push(texture)
      }
      return texture
    }),
  ).catch((cause: unknown) => {
    failed = true
    owned.forEach((texture) => texture.close())
    throw cause
  })
}

/** Uploads unique source images once, retaining source alpha for interaction queries. */
export const createGpuResources = async (
  options: CreatePlayerRendererOptions,
  size: {readonly width: number; readonly height: number},
) => {
  const direct = options.gpuPresentation === 'worker-canvas'
  if (direct && typeof options.canvas.transferControlToOffscreen !== 'function') {
    throw new Error('Worker Canvas presentation requires a transferable canvas')
  }
  if (direct && options.onBeforeRender !== undefined) {
    throw new Error('Worker Canvas presentation does not support onBeforeRender')
  }
  const {document} = options
  const sources = [...new Set(document.parts.map((part) => part.texture.src))]
  const concurrency = 4
  const samples = 4
  const metadata = describeMeshes(document, sources)
  const client = createGpuClient(options.alphaCapture, direct ? 'direct' : 'bitmap')
  try {
    if (direct) {
      options.canvas.width = size.width
      options.canvas.height = size.height
    }
    const surface = direct ? options.canvas.transferControlToOffscreen() : undefined
    await client.initialize({
      ...size,
      alphaCapture: options.alphaCapture !== undefined,
      kind: 'initialize',
      metadata,
      samples: options.antialiasing === 'ssaa' ? 1 : samples,
      ...(surface === undefined ? {} : {surface}),
    })
    const load = limitAsync(loadTextureImage, concurrency)
    const decoded = await Promise.all(sources.map(load))
    await client.uploadTextures(await convertTextures(decoded))
    const images = new Map(sources.map((source, index) => [source, decoded[index]!]))
    if (surface !== undefined) {
      return {client, context: null, images}
    }
    const context = options.canvas.getContext('bitmaprenderer')
    if (context === null) {
      throw new Error('GPU bitmap presentation is unavailable')
    }
    return {client, context, images}
  } catch (cause) {
    client.destroy()
    throw cause
  }
}
