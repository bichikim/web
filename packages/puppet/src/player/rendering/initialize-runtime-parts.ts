import {type Container, MeshSimple, Texture} from 'pixi.js'
import type {PuppetDocument} from '../document'
import {getPartRenderPlans} from '../internal/render-plan'
import {applyDocumentScene} from './apply-document-scene'
import {createRuntimePartMask} from './part-mask'
import type {RuntimePart} from './types'

const loadTexture = async (source: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()

  return Texture.from(image)
}

interface InitializeRuntimePartsOptions {
  readonly document: PuppetDocument
  readonly partById: Map<string, RuntimePart>
  readonly root: Container
}

export const initializeRuntimeParts = async (options: InitializeRuntimePartsOptions) => {
  const textureResults = await Promise.allSettled(
    options.document.parts.map((part) => loadTexture(part.texture.src)),
  )
  const failedTexture = textureResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (failedTexture !== undefined) {
    for (const result of textureResults) {
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

  const plans = getPartRenderPlans(options.document)
  const planById = new Map(plans.map((plan) => [plan.partId, plan]))
  for (const runtimePart of options.partById.values()) {
    const plan = planById.get(runtimePart.partId)
    runtimePart.mask =
      plan?.mask === undefined
        ? undefined
        : createRuntimePartMask({
            document: options.document,
            partById: options.partById,
            plan: plan.mask,
          })
    if (runtimePart.mask !== undefined) {
      runtimePart.mask.filter.inverse = plan?.properties.invertedMask ?? false
    }
  }

  applyDocumentScene(plans, options.partById, options.root)
}
