import {useWeightSelection} from './use-weight-selection'
import {useDeformerWeightPreview} from './use-deformer-weight-preview'
import {createEffect, createMemo, createSignal, mergeProps, on} from 'solid-js'
import {getDocumentScene, type PuppetVertexReference} from '../../player'
import {setDeformerVertexWeight, setDeformerVertexWeights} from './deformer-weights'
import {findNodeLock} from './scene-tree'
import type {SelectedDeformerProps} from './DeformerEditor'
import {useWeightPaint} from './use-weight-paint'

export const useDeformerWeights = (props: SelectedDeformerProps) => {
  const [enabled, setEnabled] = createSignal(false)
  const [tool, setTool] = createSignal<'paint' | 'select'>('paint')
  const [boneIndex, setBoneIndex] = createSignal(0)
  const INITIAL_WEIGHT = 0.5
  const [batchWeight, setBatchWeight] = createSignal(INITIAL_WEIGHT)
  const preview = useDeformerWeightPreview(
    mergeProps(props, {
      get boneIndex() {
        return boneIndex()
      },
    }),
  )
  const {vertices, vertexWeights, influence, triangles, segments} = preview
  const selection = useWeightSelection({
    get vertices() {
      return vertices()
    },
  })
  const {isSelected, selectedVertices, selected} = selection
  const weights = () => {
    const vertex = selected()
    return vertex === undefined
      ? []
      : vertexWeights().get(JSON.stringify([vertex.partId, vertex.vertexIndex]))!
  }
  const nodeLocked = () =>
    props.onDocumentChange === undefined ||
    findNodeLock(getDocumentScene(props.document).roots, props.node.id) === true
  const vertexLocked = (vertex: PuppetVertexReference) =>
    nodeLocked() || findNodeLock(getDocumentScene(props.document).roots, vertex.partId) === true
  const locked = () => {
    const vertex = selected()
    return nodeLocked() || (vertex !== undefined && vertexLocked(vertex))
  }
  const editableSelection = () => selectedVertices().filter((vertex) => !vertexLocked(vertex))
  const brush = useWeightPaint(
    mergeProps(props, {
      get boneIndex() {
        return boneIndex()
      },
      get enabled() {
        return enabled()
      },
      get locked() {
        return nodeLocked()
      },
      get painting() {
        return tool() === 'paint'
      },
      get vertices() {
        return vertices()
      },
    }),
  )
  const change = (index: number, weight?: number) => {
    const vertex = selected()
    if (vertex === undefined || locked()) {
      return
    }
    const document = setDeformerVertexWeight({
      ...vertex,
      boneIndex: index,
      document: props.document,
      nodeId: props.node.id,
      weight,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const applySelection = (reset = false) => {
    brush.stop()
    const document = setDeformerVertexWeights({
      changes: editableSelection().map((vertex) => ({
        ...vertex,
        boneIndex: boneIndex(),
        weight: reset ? undefined : batchWeight(),
      })),
      document: props.document,
      nodeId: props.node.id,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const nodeId = createMemo(() => `${props.node.id}:${props.node.controlPoints.length}`)
  createEffect(
    on(
      () => props.deformerMode,
      () => {
        brush.stop()
        setEnabled(false)
      },
      {defer: true},
    ),
  )
  createEffect(
    on(nodeId, () => {
      brush.stop()
      selection.clear()
      setEnabled(false)
      setBoneIndex(0)
    }),
  )
  return {
    enabled,
    isBone: () => props.node.boneRestPoints !== undefined,
    brush,
    locked,
    boneIndex,
    selected,
    batchWeight,
    vertices,
    change,
    weights,
    influence,
    isSelected,
    canApply: () => editableSelection().length > 0,
    tool,
    applySelection,
    clearSelection: () => selection.clear(),
    setBatchWeight,
    selectAll: () => selection.selectAll(vertices().filter((vertex) => !vertexLocked(vertex))),
    triangles,
    manual: () => preview.isManual(selected()),
    selectionCount: () => selectedVertices().length,
    segments,
    select: (vertex: PuppetVertexReference, additive = false) => {
      if (tool() !== 'select') {
        return
      }
      selection.select(vertex, additive)
    },
    setBoneIndex: (value: number) => {
      brush.stop()
      setBoneIndex(value)
    },
    setTool: (value: 'paint' | 'select') => {
      brush.stop()
      setTool(value)
    },
    toggle: () => {
      brush.stop()
      setEnabled((value) => !value)
    },
    viewBox: preview.viewBox,
  }
}
