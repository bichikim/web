import type {PuppetDocument, PuppetSceneDeformerNode} from '../../player'
import {addDeformerCurveHandle, removeDeformerCurveHandle} from './deformer-curve-handles'
import {resizeDeformer} from './scene-graph'

/** Grid division and curve handle edits of the inspected deformer. */
export const createDeformerHandlers = (
  props: {
    readonly document: PuppetDocument
    readonly onDocumentChange?: (document: PuppetDocument) => void
  },
  deformerNode: () => PuppetSceneDeformerNode | undefined,
) => {
  const handleGridDivisionChange = (axis: 'columns' | 'rows', divisions: number) => {
    const node = deformerNode()

    if (node === undefined || !Number.isInteger(divisions)) {
      return
    }

    const document = resizeDeformer({
      columns: axis === 'columns' ? divisions : node.columns,
      document: props.document,
      nodeId: node.id,
      rows: axis === 'rows' ? divisions : node.rows,
    })

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleCurveToggle = (pointIndex: number, hasHandle: boolean) => {
    const node = deformerNode()
    const document =
      node === undefined
        ? undefined
        : hasHandle
          ? removeDeformerCurveHandle(props.document, node.id, pointIndex)
          : addDeformerCurveHandle(props.document, node.id, pointIndex)

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  return {handleCurveToggle, handleGridDivisionChange}
}
