import type {Container} from 'pixi.js'
import {
  composeParameterGlue,
  composeParameterScene,
  composeParameterVertices,
  type PuppetParameterValueMap,
} from '../../deformation'
import type {PuppetDocument} from '../document'
import {mixMotionVertices, type MotionMix} from '../playback'
import {getPartRenderFrame} from '../internal/render-plan'
import {applySceneDeformers} from '../internal/scene-deformation'
import type {SpatialPartPose} from '../internal/spatial-part'
import {applyDocumentScene} from './apply-document-scene'
import {applyPartRenderProperties} from './apply-part-render-properties'
import {updateRuntimeMask} from './part-mask'
import type {RuntimePart} from './types'

interface ApplyFrameVerticesOptions {
  readonly document: PuppetDocument
  readonly mix: MotionMix
  readonly parameterValues: PuppetParameterValueMap | undefined
  readonly partId: string
  readonly runtimePart: RuntimePart
  readonly spatialPose?: SpatialPartPose
}

const applyFrameVertices = (options: ApplyFrameVerticesOptions) => {
  options.runtimePart.vertices.set(
    composeParameterVertices({
      document: options.document,
      parameterValues: options.parameterValues,
      partId: options.partId,
      restVertices: options.runtimePart.restVertices,
    }),
  )
  options.runtimePart.vertices.set(
    mixMotionVertices({
      partId: options.partId,
      restVertices: options.runtimePart.restVertices,
      samples: options.mix.vertexSamples,
      vertices: options.runtimePart.vertices,
    }),
  )
  if (options.spatialPose !== undefined) {
    for (let index = 0; index < options.spatialPose.vertices.length; index += 1) {
      options.runtimePart.vertices[index] +=
        options.spatialPose.vertices[index]! - options.runtimePart.restVertices[index]!
    }
  }
}

interface ApplyRenderFrameOptions {
  readonly mix: MotionMix
  readonly parameterValues: PuppetParameterValueMap
  readonly document: PuppetDocument
  readonly layoutRoot: () => void
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

export const applyRenderFrame = (options: ApplyRenderFrameOptions): void => {
  const frameParameterValues = options.parameterValues
  const posedScene = composeParameterScene(options.document, frameParameterValues)
  const {plans: renderPlans, spatialPoses} = getPartRenderFrame(
    options.document,
    frameParameterValues,
    posedScene,
  )
  const planById = new Map(renderPlans.map((plan) => [plan.partId, plan]))

  for (const [partId, runtimePart] of options.partById) {
    applyFrameVertices({
      document: options.document,
      mix: options.mix,
      parameterValues: frameParameterValues,
      partId,
      runtimePart,
      spatialPose: spatialPoses.get(partId),
    })
  }

  applySceneDeformers({
    document: {
      ...options.document,
      glue: composeParameterGlue({
        document: options.document,
        parameterValues: frameParameterValues,
      }),
      scene: posedScene,
    },
    verticesByPartId: new Map(
      [...options.partById].map(([partId, runtimePart]) => [partId, runtimePart.vertices]),
    ),
  })

  for (const runtimePart of options.partById.values()) {
    runtimePart.mesh.vertices = runtimePart.vertices
    const plan = planById.get(runtimePart.partId)
    if (plan !== undefined) {
      applyPartRenderProperties(plan.properties, runtimePart)
    }
  }

  for (const runtimePart of options.partById.values()) {
    if (runtimePart.mask !== undefined) {
      updateRuntimeMask({
        mask: runtimePart.mask,
        partById: options.partById,
        planById,
      })
    }
  }

  applyDocumentScene(renderPlans, options.partById, options.root)
  options.layoutRoot()
}
