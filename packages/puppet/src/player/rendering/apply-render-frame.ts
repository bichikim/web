import type {Container} from 'pixi.js'
import {
  composeParameterGlue,
  composeParameterVertices,
  composeRenderScene,
  type PuppetParameterValueMap,
} from '../../deformation'
import type {PuppetDocument} from '../document'
import {mixMotionVertices, type MotionMix} from '../playback'
import {getPartRenderFrame} from '../internal/render-plan'
import type {RenderOverrides} from '../internal/render-overrides'
import {applySceneDeformers} from '../internal/scene-deformation'
import type {SpatialPartPose} from '../internal/spatial-part'
import type {NativeDeformation} from '../internal/create-native-deformation'
import {applyDocumentScene} from './apply-document-scene'
import {applyLayerRenderProperties, applyPartRenderProperties} from './apply-effect-filters'
import {cullFlippedTriangles} from './cull-flipped-triangles'
import {updateRuntimeMask} from './part-mask'
import type {RuntimeLayer, RuntimePart} from './types'

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
  /** Owned native coordinate evaluator; omitted, compose the general scene. */
  readonly native?: NativeDeformation
  readonly mix: MotionMix
  readonly parameterValues: PuppetParameterValueMap
  readonly overrides?: RenderOverrides
  readonly poseOpacityByPartId?: ReadonlyMap<string, number>
  readonly document: PuppetDocument
  readonly layoutRoot: () => void
  readonly layerById: ReadonlyMap<string, RuntimeLayer>
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

/** Applies one frame and returns the part IDs in paint order, back to front. */
export const applyRenderFrame = (options: ApplyRenderFrameOptions): ReadonlyArray<string> => {
  const frameParameterValues = options.parameterValues
  const posedScene =
    options.native === undefined
      ? composeRenderScene(options.document, frameParameterValues)
      : undefined
  const frame = getPartRenderFrame(options.document, frameParameterValues, posedScene, {
    mix: options.mix,
    overrides: options.overrides,
    poseOpacityByPartId: options.poseOpacityByPartId,
  })
  const {plans: renderPlans, spatialPoses} = frame
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
    deferCoordinates: true,
    document: {
      ...options.document,
      glue: composeParameterGlue({
        document: options.document,
        parameterValues: frameParameterValues,
      }),
      ...(posedScene === undefined ? {} : {scene: posedScene}),
    },
    native: options.native,
    parameterValues: frameParameterValues,
    verticesByPartId: new Map(
      [...options.partById].map(([partId, runtimePart]) => [partId, runtimePart.vertices]),
    ),
  })

  const documentPartById = new Map(options.document.parts.map((part) => [part.id, part]))
  for (const runtimePart of options.partById.values()) {
    runtimePart.mesh.vertices = runtimePart.vertices
    const plan = planById.get(runtimePart.partId)
    if (plan !== undefined) {
      applyPartRenderProperties(plan.properties, runtimePart)
    }
    const indices = documentPartById.get(runtimePart.partId)?.mesh.indices
    const culling = plan?.properties.culling === true
    if (indices !== undefined && (culling || runtimePart.culled === true)) {
      runtimePart.mesh.geometry.indices = culling
        ? cullFlippedTriangles(indices, runtimePart.restVertices, runtimePart.vertices)
        : new Uint32Array(indices)
      runtimePart.culled = culling
    }
  }

  for (const runtimeLayer of options.layerById.values()) {
    const plan = frame.layers.get(runtimeLayer.groupId)
    if (plan !== undefined) {
      applyLayerRenderProperties(plan.properties, runtimeLayer)
    }
    runtimeLayer.memberPartIds = renderPlans.flatMap((partPlan) =>
      partPlan.visible && partPlan.layerIds.includes(runtimeLayer.groupId) ? [partPlan.partId] : [],
    )
  }

  for (const runtimeMask of [
    ...[...options.partById.values()].map((runtimePart) => runtimePart.mask),
    ...[...options.layerById.values()].map((runtimeLayer) => runtimeLayer.mask),
  ]) {
    if (runtimeMask !== undefined) {
      updateRuntimeMask({
        mask: runtimeMask,
        partById: options.partById,
        planById,
      })
    }
  }

  applyDocumentScene({
    frame,
    layerById: options.layerById,
    partById: options.partById,
    root: options.root,
  })
  options.layoutRoot()
  return renderPlans.map((plan) => plan.partId)
}
