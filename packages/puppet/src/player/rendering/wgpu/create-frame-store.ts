import type {PlayerRenderer} from '../create-player-renderer'
import type {PuppetDocument} from '../../document'
import {type ComputedRenderFrame, computeRenderFrame} from '../../internal/compute-render-frame'
import {createNativeDeformation} from '../../internal/create-native-deformation'
import {findHitArea} from '../../internal/hit-area'
import {canReusePartResources} from '../../internal/render-plan'
import {supportsWgpuDocument} from './supports-document'

const reusableGeometry = (document: PuppetDocument, next: PuppetDocument) =>
  canReusePartResources(document, next) &&
  supportsWgpuDocument(next) &&
  next.parts.every((part, index) => {
    const previous = document.parts[index]!
    return (
      part.properties?.invertedMask === previous.properties?.invertedMask &&
      part.mesh.vertices.length === previous.mesh.vertices.length &&
      part.mesh.indices.length === previous.mesh.indices.length &&
      part.mesh.uvs.length === previous.mesh.uvs.length &&
      part.mesh.vertices.every((value, position) => value === previous.mesh.vertices[position]) &&
      part.mesh.indices.every((value, position) => value === previous.mesh.indices[position]) &&
      part.mesh.uvs.every((value, position) => value === previous.mesh.uvs[position])
    )
  })

/** Keeps displayed geometry owned after the numeric Worker recycles its frame buffers. */
export const createGpuFrameStore = (initial: PuppetDocument) => {
  let document = initial
  let native = createNativeDeformation(document)
  let candidate: ComputedRenderFrame | undefined
  let prepared: ComputedRenderFrame | undefined
  let displayed: ComputedRenderFrame | undefined
  let displayedDocument = initial
  let pending: PuppetDocument | undefined
  const partIndex = new Map(document.parts.map((part, index) => [part.id, index]))
  const storage = new Float32Array(
    document.parts.reduce((sum, part) => sum + part.mesh.vertices.length, 0),
  )
  let offset = 0
  const current = new Map(
    document.parts.map((part) => {
      const vertices = storage.subarray(offset, offset + part.mesh.vertices.length)
      offset += vertices.length
      return [part.id, vertices]
    }),
  )
  const getPaintOrder = () => displayed?.frame.plans.map((plan) => plan.partId) ?? []
  const getPartVertices = (id: string) => current.get(id)
  const evaluated = new Map(
    document.parts.map((part) => [part.id, new Float32Array(part.mesh.vertices)]),
  )
  const replace = (next: PuppetDocument) => {
    document = next
    native = createNativeDeformation(next)
  }
  const commit = () => {
    if (pending !== undefined) {
      replace(pending)
      pending = undefined
    }
  }
  const applyFrame: PlayerRenderer['applyFrame'] = (
    mix,
    parameterValues,
    poseOpacityByPartId,
    overrides,
  ) => {
    commit()
    const frame = computeRenderFrame({
      document,
      mix,
      native,
      overrides,
      parameterValues,
      poseOpacityByPartId,
      verticesByPartId: evaluated,
    })
    let position = 0
    const vertices = new Float32Array(storage.length)
    for (const part of document.parts) {
      const values = evaluated.get(part.id)!
      vertices.set(values, position)
      position += values.length
    }
    prepared = undefined
    candidate = {frame, vertices}
  }
  return {
    applyFrame,
    applyPreparedFrame(frame: ComputedRenderFrame) {
      commit()
      prepared = frame
    },
    cancel() {
      prepared = undefined
      candidate = displayed
    },
    document: () => document,
    frame: () => displayed?.frame,
    getPaintOrder,
    getPartVertices,
    hitTest(point: {readonly x: number; readonly y: number}) {
      return findHitArea({
        document: displayedDocument,
        paintOrder: getPaintOrder(),
        point,
        vertices: getPartVertices,
      })
    },
    partIndex,
    // Buffered frames belong to the playback session until their presentation settles.
    redrawable: () => (prepared === undefined ? candidate : displayed),
    show(frame: ComputedRenderFrame, source: PuppetDocument) {
      storage.set(frame.vertices)
      displayed = {...frame, geometry: undefined, vertices: storage}
      displayedDocument = source
      if (prepared === frame) {
        prepared = undefined
        candidate = displayed
      } else if (candidate === frame) {
        candidate = displayed
      }
    },
    updateDocument(next: PuppetDocument, deferred = false) {
      if (!reusableGeometry(document, next)) {
        return false
      }
      if (deferred) {
        pending = next
      } else {
        replace(next)
      }
      return true
    },
  }
}
