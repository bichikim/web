import {limitAsync} from 'es-toolkit/promise'
import {Container, MeshSimple, Texture} from 'pixi.js'
import type {PuppetDocument} from '../document'
import {getPartRenderFrame} from '../internal/render-plan'
import {applyDocumentScene} from './apply-document-scene'
import {createRuntimePartMask} from './part-mask'
import type {RuntimeLayer, RuntimePart} from './types'
import {loadTextureImage} from './load-texture-image'

// Chromium fails some decodes ("cannot be decoded") when many large images, such as texture
// atlas pages, decode at once; a few at a time keeps loading parallel without that.
const MAXIMUM_CONCURRENT_DECODES = 4

const loadTexture = limitAsync(async (source: string) => {
  const image = await loadTextureImage(source)

  return Texture.from({autoGenerateMipmaps: true, resource: image, scaleMode: 'linear'})
}, MAXIMUM_CONCURRENT_DECODES)

interface InitializeRuntimePartsOptions {
  readonly antialias?: boolean
  readonly document: PuppetDocument
  readonly layerById: Map<string, RuntimeLayer>
  readonly partById: Map<string, RuntimePart>
  readonly root: Container
}

export const initializeRuntimeParts = async (options: InitializeRuntimePartsOptions) => {
  // Parts sharing an image (an atlas) share one texture.
  const sources = [...new Set(options.document.parts.map((part) => part.texture.src))]
  const loaded = await Promise.allSettled(sources.map(loadTexture))
  const resultBySource = new Map(sources.map((source, index) => [source, loaded[index]!]))
  const textureResults = options.document.parts.map((part) => resultBySource.get(part.texture.src)!)
  const failedTexture = textureResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (failedTexture !== undefined) {
    for (const result of loaded) {
      if (result.status === 'fulfilled') {
        result.value.destroy(true)
      }
    }

    throw failedTexture.reason
  }

  for (const [index, part] of options.document.parts.entries()) {
    const textureResult = textureResults[index]

    if (textureResult?.status !== 'fulfilled') {
      throw new Error(`Missing texture for part: ${part.id}`)
    }

    const restVertices = part.mesh.vertices
    const vertices = new Float32Array(restVertices)
    const mesh = new MeshSimple({
      indices: new Uint32Array(part.mesh.indices),
      texture: textureResult.value,
      topology: 'triangle-list',
      uvs: new Float32Array(part.mesh.uvs),
      vertices,
    })

    options.partById.set(part.id, {mesh, partId: part.id, restVertices, vertices})
  }

  const frame = getPartRenderFrame(options.document)
  const {plans} = frame
  const planById = new Map(plans.map((plan) => [plan.partId, plan]))
  // Masks draw other parts, so they are attached once every part exists.
  for (const runtimePart of options.partById.values()) {
    const plan = planById.get(runtimePart.partId)
    if (plan?.mask !== undefined) {
      const mask = createRuntimePartMask({
        antialias: options.antialias,
        document: options.document,
        partById: options.partById,
        plan: plan.mask,
      })
      mask.filter.inverse = plan.properties.invertedMask
      options.partById.set(runtimePart.partId, {...runtimePart, mask})
    }
  }

  for (const layer of frame.layers.values()) {
    options.layerById.set(layer.groupId, {
      container: new Container(),
      groupId: layer.groupId,
      mask:
        layer.mask === undefined
          ? undefined
          : createRuntimePartMask({
              antialias: options.antialias,
              document: options.document,
              partById: options.partById,
              plan: layer.mask,
            }),
      memberPartIds: [],
    })
  }

  applyDocumentScene({
    frame,
    layerById: options.layerById,
    partById: options.partById,
    root: options.root,
  })
}
