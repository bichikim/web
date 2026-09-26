import type {PuppetParameterValues} from '../deformation'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {commitVertexMove} from './commit-vertex-move'
import type {IndexedVertex} from './internal/mesh-view'
import {getDeformerPreviewDocument} from './internal/mesh-preview'
import {unapplySceneDeformersPoint} from './internal/scene-deformation'
import type {MeshEditorProps} from './mesh-editor-contract'
import {moveMeshVertex} from './move-mesh-vertex'

interface ApplyDeformBrushStrokeOptions {
  readonly document: PuppetDocument
  readonly draft: ReadonlyArray<IndexedVertex>
  readonly part: PuppetPart
  readonly props: MeshEditorProps
  readonly source: ReadonlyArray<IndexedVertex>
  readonly time: number | null
  readonly values: PuppetParameterValues | null
}

interface StrokeSuccess {
  readonly document: PuppetDocument
  readonly ok: true
}

interface StrokeFailure {
  readonly message: string
  readonly ok: false
}

export type StrokeResult = StrokeSuccess | StrokeFailure

/** Applies every displaced vertex to one document before the caller records the stroke. */
export const applyDeformBrushStroke = (options: ApplyDeformBrushStrokeOptions): StrokeResult => {
  let {document} = options
  const changed = options.draft.filter((point) => {
    const before = options.source[point.index]
    return before !== undefined && (before.x !== point.x || before.y !== point.y)
  })
  for (const vertex of changed) {
    if (options.props.meshEditing) {
      const result = moveMeshVertex({
        document,
        partId: options.part.id,
        vertexIndex: vertex.index,
        x: vertex.x,
        y: vertex.y,
      })
      if (!result.ok) {
        return {message: result.message, ok: false}
      }
      const {document: nextDocument} = result
      document = nextDocument
    } else {
      const point = unapplySceneDeformersPoint({
        document: getDeformerPreviewDocument(options.props),
        partId: options.part.id,
        point: vertex,
        vertexIndex: vertex.index,
      })
      const part = document.parts.find((candidate) => candidate.id === options.part.id)
      if (part === undefined) {
        return {message: '편집할 파츠를 찾지 못했습니다.', ok: false}
      }
      const result = commitVertexMove({
        ...point,
        bindingId: options.props.activeBindingId,
        document,
        editMode: options.props.editMode ?? 'motion',
        keyframeTime: options.time,
        parameterValueMap: options.props.parameterValueMap,
        parameterValues: options.values,
        part,
        vertexIndex: vertex.index,
      })
      if (!result.ok) {
        return result
      }
      const {document: nextDocument} = result
      document = nextDocument
    }
  }
  return {document, ok: true}
}
