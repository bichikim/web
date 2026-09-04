import {applySceneNodeDeformers} from '../../deformation'
import type {PuppetDocument} from '../document'
import {getDocumentScene} from '../scene'

export interface ApplySceneDeformersOptions {
  readonly document: PuppetDocument
  readonly verticesByPartId: ReadonlyMap<string, Float32Array | number[]>
}

export const applySceneDeformers = (options: ApplySceneDeformersOptions) => {
  applySceneNodeDeformers(getDocumentScene(options.document).roots, options.verticesByPartId)
}
