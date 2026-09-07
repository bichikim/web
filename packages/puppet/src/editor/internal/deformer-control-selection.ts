import {type Accessor, createSignal} from 'solid-js'

import type {PuppetPoint} from '../../player'

export type DeformerDragTarget =
  | {readonly kind: 'controlPoint'; readonly pointIndex: number}
  | {
      readonly axis: 'horizontal' | 'vertical'
      readonly kind: 'curveHandle'
      readonly pointIndex: number
    }
  | {readonly kind: 'rotation'}
  | {readonly kind: 'rotationOrigin'}
  | {readonly kind: 'translation'; readonly previousPoint: PuppetPoint}

type ExclusiveDeformerControl = 'rotation' | 'rotationOrigin'

interface DeformerControlSelectionValue {
  readonly exclusiveControl: ExclusiveDeformerControl | null
  readonly nodeId: string
  readonly pointIndices: ReadonlyArray<number>
}

export interface DeformerSelectionModifiers {
  readonly ctrlKey: boolean
  readonly metaKey: boolean
}

export interface DeformerTopology {
  readonly columns: number
  readonly nodeId: string
  readonly rows: number
}

export interface DeformerControlSelection {
  readonly clear: () => void
  readonly isSelected: (nodeId: string, target: DeformerDragTarget) => boolean
  readonly select: (
    event: DeformerSelectionModifiers,
    nodeId: string,
    target: DeformerDragTarget,
  ) => void
  readonly selectedPointIndices: Accessor<ReadonlyArray<number>>
  readonly syncTopology: (topology: DeformerTopology) => void
}

const getExclusiveControl = (target: DeformerDragTarget): ExclusiveDeformerControl | null => {
  switch (target.kind) {
    case 'rotation':
      return 'rotation'
    case 'rotationOrigin':
      return 'rotationOrigin'
    case 'controlPoint':
    case 'curveHandle':
    case 'translation':
      return null
    default: {
      const unreachable: never = target
      return unreachable
    }
  }
}

const getNextSelection = (
  current: DeformerControlSelectionValue | null,
  event: DeformerSelectionModifiers,
  nodeId: string,
  target: DeformerDragTarget,
): DeformerControlSelectionValue | null => {
  if (target.kind === 'translation') {
    return null
  }

  if (target.kind === 'curveHandle') {
    return current?.nodeId === nodeId ? current : null
  }

  if (target.kind !== 'controlPoint') {
    return {exclusiveControl: getExclusiveControl(target), nodeId, pointIndices: []}
  }

  const additive = event.metaKey || event.ctrlKey
  const currentIndices = current?.nodeId === nodeId ? current.pointIndices : []
  const pointIndices = additive
    ? currentIndices.includes(target.pointIndex)
      ? currentIndices.filter((pointIndex) => pointIndex !== target.pointIndex)
      : [...currentIndices, target.pointIndex]
    : [target.pointIndex]

  return pointIndices.length === 0 ? null : {exclusiveControl: null, nodeId, pointIndices}
}

export const createDeformerControlSelection = (): DeformerControlSelection => {
  const [selection, setSelection] = createSignal<DeformerControlSelectionValue | null>(null)
  let previousTopology: DeformerTopology | null = null

  return {
    clear: () => setSelection(null),
    isSelected(nodeId, target) {
      const current = selection()
      if (current === null || current.nodeId !== nodeId) {
        return false
      }

      switch (target.kind) {
        case 'controlPoint':
          return current.pointIndices.includes(target.pointIndex)
        case 'rotation':
        case 'rotationOrigin':
          return current.exclusiveControl === target.kind
        case 'curveHandle':
        case 'translation':
          return false
        default: {
          const unreachable: never = target
          return unreachable
        }
      }
    },
    select: (event, nodeId, target) =>
      setSelection((current) => getNextSelection(current, event, nodeId, target)),
    selectedPointIndices: () => selection()?.pointIndices ?? [],
    syncTopology(topology) {
      const changed =
        previousTopology !== null &&
        (topology.nodeId !== previousTopology.nodeId ||
          topology.columns !== previousTopology.columns ||
          topology.rows !== previousTopology.rows)
      previousTopology = topology

      if (changed) {
        setSelection(null)
      }
    },
  }
}
