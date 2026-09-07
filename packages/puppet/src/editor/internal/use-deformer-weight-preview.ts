import {getEditorViewBox} from './viewport'
import {createMemo} from 'solid-js'
import {getDeformerWeights} from '../../deformation/weights'
import {applySceneNodeDeformers} from '../../deformation/vertices'
import {getDocumentScene, getScenePartStates, type PuppetVertexReference} from '../../player'
import {getDeformerInputVertices, getDeformerParts} from './deformer-weights'
import {applySceneNodeAncestorsPoint} from './scene-deformation'
import type {SelectedDeformerProps} from './DeformerEditor'
export interface UseDeformerWeightPreviewProps extends SelectedDeformerProps {
  readonly boneIndex: number
}
export const useDeformerWeightPreview = (props: UseDeformerWeightPreviewProps) => {
  const parts = createMemo(() => getDeformerParts(props.document, props.node))
  const inputs = createMemo(() => getDeformerInputVertices(props.document, props.node))
  const vertices = createMemo(() => {
    const document = props.previewDocument ?? props.document
    const positions = new Map(document.parts.map((part) => [part.id, [...part.mesh.vertices]]))
    applySceneNodeDeformers(getDocumentScene(document).roots, positions)
    const visible = new Set(
      getScenePartStates(document)
        .filter((part) => part.visible)
        .map((part) => part.partId),
    )
    return parts()
      .filter((part) => visible.has(part.id))
      .flatMap((part) =>
        Array.from({length: part.mesh.vertices.length / 2}, (_, vertexIndex) => ({
          partId: part.id,
          vertexIndex,
          x: positions.get(part.id)![vertexIndex * 2]!,
          y: positions.get(part.id)![vertexIndex * 2 + 1]!,
        })),
      )
  })
  const vertexWeights = createMemo(
    () =>
      new Map(
        vertices().map((vertex) => {
          const input = inputs().get(vertex.partId)!
          return [
            JSON.stringify([vertex.partId, vertex.vertexIndex]),
            getDeformerWeights(
              props.node,
              {x: input[vertex.vertexIndex * 2]!, y: input[vertex.vertexIndex * 2 + 1]!},
              vertex,
            ),
          ]
        }),
      ),
  )
  const influence = (vertex: PuppetVertexReference) =>
    vertexWeights().get(JSON.stringify([vertex.partId, vertex.vertexIndex]))?.[props.boneIndex] ?? 0
  const triangles = createMemo(() =>
    parts().flatMap((part) => {
      const positions = new Map(
        vertices()
          .filter((vertex) => vertex.partId === part.id)
          .map((vertex) => [vertex.vertexIndex, vertex]),
      )
      const result: {points: string; weight: number}[] = []
      const TRIANGLE_SIZE = 3
      for (let index = 0; index < part.mesh.indices.length; index += TRIANGLE_SIZE) {
        const points = part.mesh.indices
          .slice(index, index + TRIANGLE_SIZE)
          .flatMap((vertexIndex) => {
            const vertex = positions.get(vertexIndex)
            return vertex === undefined ? [] : [vertex]
          })
        if (points.length === TRIANGLE_SIZE) {
          result.push({
            points: points.map((point) => `${point.x},${point.y}`).join(' '),
            weight: points.reduce((sum, point) => sum + influence(point), 0) / TRIANGLE_SIZE,
          })
        }
      }
      return result
    }),
  )
  return {
    isManual: (vertex: PuppetVertexReference | undefined) =>
      (props.node.boneRestPoints === undefined
        ? props.node.vertexInfluences
        : props.node.boneWeights
      )?.some(
        (entry) => entry.partId === vertex?.partId && entry.vertexIndex === vertex?.vertexIndex,
      ) === true,

    viewBox: () => {
      const bounds = getEditorViewBox(props.document)
      return `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
    },
    influence,
    vertexWeights,
    segments: () =>
      Array.from(
        {
          length:
            props.node.boneRestPoints === undefined ? 0 : props.node.controlPoints.length / 2 - 1,
        },
        (_, index) => {
          const points = props.node.controlPoints
          const start = applySceneNodeAncestorsPoint({
            document: props.previewDocument ?? props.document,
            nodeId: props.node.id,
            point: {x: points[index * 2]!, y: points[index * 2 + 1]!},
          })
          const end = applySceneNodeAncestorsPoint({
            document: props.previewDocument ?? props.document,
            nodeId: props.node.id,
            point: {x: points[(index + 1) * 2]!, y: points[(index + 1) * 2 + 1]!},
          })
          return {index, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2}
        },
      ),
    vertices,
    triangles,
  }
}
