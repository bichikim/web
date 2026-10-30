import {applyGlue} from '../../deformation/glue'
import {applySceneNodeDeformers, type PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {getDocumentScene} from '../scene'
import type {NativeDeformation} from './create-native-deformation'

export interface ApplySceneDeformersOptions {
  /** Owner-scoped native buffers for this document; omitted, use the general evaluator. */
  readonly native?: NativeDeformation
  /** Current parameter inputs for the native evaluator; omitted inputs use document defaults. */
  readonly parameterValues?: PuppetParameterValueMap
  /** Resolve grid points on demand in a runtime frame; omitted, retain eager evaluation. */
  readonly deferCoordinates?: boolean
  /** Document data or a runtime scene for this frame. The caller retains ownership. */
  readonly document: PuppetDocument
  /** Caller-owned vertex buffers updated by deformers and glue. */
  readonly verticesByPartId: ReadonlyMap<string, Float32Array | number[]>
}

export const applySceneDeformers = (options: ApplySceneDeformersOptions) => {
  if (options.native === undefined) {
    applySceneNodeDeformers(getDocumentScene(options.document).roots, options.verticesByPartId, {
      deferCoordinates: options.deferCoordinates,
    })
  } else {
    options.native.apply(options.parameterValues, options.verticesByPartId)
  }
  applyGlue(options.document.glue ?? [], options.verticesByPartId)
}
