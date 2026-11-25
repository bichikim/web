import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {findHitArea} from '../internal/hit-area'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {RendererController} from '../rendering/create-renderer-controller'

/** Reads displayed hit areas, capturing geometry for renderers without their own displayed snapshot. */
export const createFrameQuery = (
  renderer: Pick<
    RendererController,
    'getPaintOrder' | 'getPartVertices' | 'hitTestDisplayed' | 'toDocumentPoint'
  >,
) => {
  let document: PuppetDocument | undefined
  let expression: string | undefined
  let values: PuppetParameterValueMap = {}
  let paintOrder: ReadonlyArray<string> = []
  let storage = new Float32Array(0)
  let vertices = new Map<string, Float32Array>()
  let hitTestDisplayed: RendererController['hitTestDisplayed']
  return {
    clearGeometry() {
      document = undefined
      hitTestDisplayed = undefined
      storage = new Float32Array(0)
      vertices.clear()
      paintOrder = []
    },
    getExpression: () => expression,
    getParameterValue: (id: string) => (Object.hasOwn(values, id) ? values[id] : undefined),
    getParameterValues: () => ({...values}),
    hitTest(point: {readonly x: number; readonly y: number}) {
      if (hitTestDisplayed !== undefined) {
        return hitTestDisplayed(point)
      }
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
      values = {...state.frameValues}
      expression = nextExpression
      const {hitTestDisplayed: readHitArea} = renderer
      hitTestDisplayed = readHitArea
      if (hitTestDisplayed !== undefined) {
        return
      }
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
      paintOrder = [...renderer.getPaintOrder()]
    },
  }
}
