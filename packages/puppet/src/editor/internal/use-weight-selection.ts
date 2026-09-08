import {createMemo, createSignal} from 'solid-js'
import type {PuppetVertexReference} from '../../player'
import type {WeightPaintVertex} from './weight-paint'

export interface UseWeightSelectionProps {
  readonly vertices: readonly WeightPaintVertex[]
}
const key = (vertex: PuppetVertexReference) => JSON.stringify([vertex.partId, vertex.vertexIndex])
export const useWeightSelection = (props: UseWeightSelectionProps) => {
  const [selection, setSelection] = createSignal<readonly PuppetVertexReference[]>([])
  const keys = createMemo(() => new Set(selection().map(key)))
  const isSelected = (vertex: PuppetVertexReference) => keys().has(key(vertex))
  const selectedVertices = createMemo(() => props.vertices.filter(isSelected))
  return {
    isSelected,
    clear: () => setSelection([]),
    selected: () => selectedVertices().at(-1),
    select: (vertex: PuppetVertexReference, additive = false) =>
      setSelection((previous) =>
        additive
          ? isSelected(vertex)
            ? previous.filter((entry) => key(entry) !== key(vertex))
            : [...previous, vertex]
          : [vertex],
      ),
    selectedVertices,
    selectAll: (vertices: readonly PuppetVertexReference[]) => setSelection(vertices),
  }
}
