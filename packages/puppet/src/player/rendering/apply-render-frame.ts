import type {Container} from 'pixi.js'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import type {MotionMix} from '../playback'
import {type ComputedRenderFrame, computeRenderFrame} from '../internal/compute-render-frame'
import type {RenderOverrides} from '../internal/render-overrides'
import type {NativeDeformation} from '../internal/create-native-deformation'
import {applyDocumentScene} from './apply-document-scene'
import {applyLayerRenderProperties, applyPartRenderProperties} from './apply-effect-filters'
import {cullFlippedTriangles} from './cull-flipped-triangles'
import {updateRuntimeMask} from './part-mask'
import type {RuntimeLayer, RuntimePart} from './types'

interface ApplyRenderFrameOptions {
  /** Precomputed vertices and display plan; omitted, evaluate the original frame. */
  readonly prepared?: ComputedRenderFrame
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
  const frame =
    options.prepared?.frame ??
    computeRenderFrame({
      document: options.document,
      mix: options.mix,
      native: options.native,
      overrides: options.overrides,
      parameterValues: options.parameterValues,
      poseOpacityByPartId: options.poseOpacityByPartId,
      verticesByPartId: new Map([...options.partById].map(([id, part]) => [id, part.vertices])),
    })
  const {plans: renderPlans} = frame
  const planById = new Map(renderPlans.map((plan) => [plan.partId, plan]))
  if (options.prepared !== undefined) {
    let offset = 0
    for (const part of options.document.parts) {
      const runtime = options.partById.get(part.id)
      runtime?.vertices.set(
        options.prepared.vertices.subarray(offset, offset + part.mesh.vertices.length),
      )
      offset += part.mesh.vertices.length
    }
  }

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
