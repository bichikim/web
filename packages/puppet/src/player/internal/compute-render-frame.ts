import {
  composeParameterGlue,
  composeParameterVertices,
  composeRenderScene,
  type PuppetParameterValueMap,
} from '../../deformation'
import type {PuppetDocument} from '../document'
import {mixMotionVertices, type MotionMix} from '../playback/mix-motion-frames'
import {getPartRenderFrame, type PartRenderFrame} from './render-plan'
import type {NativeDeformation} from './create-native-deformation'
import type {RenderOverrides} from './render-overrides'
import {applySceneDeformers} from './scene-deformation'

export interface ComputedRenderFrame {
  /** Exact geometry inputs before public query rounding; omitted by non-buffered callers. */
  readonly parameterValues?: PuppetParameterValueMap
  readonly frame: PartRenderFrame
  readonly vertices: Float32Array
}

interface ComputeRenderFrameOptions {
  /** Prepared source document, retained by the caller. */
  readonly document: PuppetDocument
  /** Current selected and independent motion mix. */
  readonly mix: MotionMix
  /** Owner-scoped coordinate evaluator; omitted, use the general scene evaluator. */
  readonly native?: NativeDeformation
  /** App-owned render overrides; omitted, retain document properties. */
  readonly overrides?: RenderOverrides
  /** Resolved parameter values after effects and physics. */
  readonly parameterValues: PuppetParameterValueMap
  /** Faded pose opacity; omitted, use the normal part opacity. */
  readonly poseOpacityByPartId?: ReadonlyMap<string, number>
  /** Caller-owned Float32 buffers updated in place, in document coordinates. */
  readonly verticesByPartId: ReadonlyMap<string, Float32Array>
}

/** Uses the same geometry and display evaluation on the main thread and in a Worker. */
export const computeRenderFrame = (options: ComputeRenderFrameOptions): PartRenderFrame => {
  const posedScene =
    options.native === undefined
      ? composeRenderScene(options.document, options.parameterValues)
      : undefined
  const frame = getPartRenderFrame(options.document, options.parameterValues, posedScene, {
    mix: options.mix,
    overrides: options.overrides,
    poseOpacityByPartId: options.poseOpacityByPartId,
  })
  for (const part of options.document.parts) {
    const vertices = options.verticesByPartId.get(part.id)
    if (vertices !== undefined) {
      vertices.set(
        composeParameterVertices({
          document: options.document,
          parameterValues: options.parameterValues,
          partId: part.id,
          restVertices: part.mesh.vertices,
        }),
      )
      if ((options.mix.vertexSamples.get(part.id)?.size ?? 0) > 0) {
        vertices.set(
          mixMotionVertices({
            partId: part.id,
            restVertices: part.mesh.vertices,
            samples: options.mix.vertexSamples,
            vertices,
          }),
        )
      }
      const spatial = frame.spatialPoses.get(part.id)
      if (spatial !== undefined) {
        for (let index = 0; index < spatial.vertices.length; index += 1) {
          vertices[index] += spatial.vertices[index]! - part.mesh.vertices[index]!
        }
      }
    }
  }
  applySceneDeformers({
    deferCoordinates: true,
    document: {
      ...options.document,
      glue: composeParameterGlue({
        document: options.document,
        parameterValues: options.parameterValues,
      }),
      ...(posedScene === undefined ? {} : {scene: posedScene}),
    },
    native: options.native,
    parameterValues: options.parameterValues,
    verticesByPartId: options.verticesByPartId,
  })
  return frame
}
