import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {findHitArea} from '../internal/hit-area'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {RendererController} from '../rendering/create-renderer-controller'

/** Owns displayed coordinates so async input and GPU resource updates cannot change hit-test results. */
export const createFrameQuery = (
  renderer: Pick<RendererController, 'getPaintOrder' | 'getPartVertices' | 'toDocumentPoint'>,
) => {
  let document: PuppetDocument | undefined
  let expression: string | undefined
  let values: PuppetParameterValueMap = {}
  let paintOrder: ReadonlyArray<string> = []
  let storage = new Float32Array(0)
  let vertices = new Map<string, Float32Array>()
  return {
    clearGeometry() {
      document = undefined
      storage = new Float32Array(0)
      vertices.clear()
      paintOrder = []
    },
    getExpression: () => expression,
    getParameterValue: (id: string) => (Object.hasOwn(values, id) ? values[id] : undefined),
    getParameterValues: () => ({...values}),
    hitTest(point: {readonly x: number; readonly y: number}) {
      return document === undefined
        ? undefined
        : findHitArea({
            document,
            paintOrder,
            point: renderer.toDocumentPoint(point),
            vertices: (id) => vertices.get(id),
          })
    },
    update(source: PuppetDocument, state: PlayerRuntimeState, nextExpression: string | undefined) {
      if (document !== source) {
        const size = source.parts.reduce((total, part) => total + part.mesh.vertices.length, 0)
        if (storage.length !== size) {
          storage = new Float32Array(size)
        }
        let offset = 0
        vertices = new Map(
          source.parts.map((part) => {
            const buffer = storage.subarray(offset, offset + part.mesh.vertices.length)
            offset += buffer.length
            return [part.id, buffer]
          }),
        )
        document = source
      }
      for (const part of source.parts) {
        const displayed = renderer.getPartVertices(part.id) ?? part.mesh.vertices
        vertices.get(part.id)!.set(displayed)
      }
      values = {...state.frameValues}
      expression = nextExpression
      paintOrder = [...renderer.getPaintOrder()]
    },
  }
}
