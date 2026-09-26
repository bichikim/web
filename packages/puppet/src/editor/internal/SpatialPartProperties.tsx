import {createMemo, createSignal, For, Show} from 'solid-js'

import {EditorNumberField, EditorSelect} from '../../design-system'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPart,
  type PuppetSpatialSurface,
} from '../../player'
import {setSpatialSurface} from './set-spatial-surface'
import {findNode, findParentId} from './scene-tree'

export interface SpatialPartPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly part: PuppetPart
}

const AXES = ['X', 'Y', 'Z'] as const
const COORDINATES_PER_POINT = 3
const belongsToSpatialDeformer = (document: PuppetDocument, partId: string) => {
  const {roots} = getDocumentScene(document)
  let parentId = findParentId(roots, partId)
  while (parentId !== null && parentId !== undefined) {
    const parent = findNode(roots, parentId)
    if (parent?.kind === 'deformer' && parent.deformerType === 'spatial') {
      return true
    }
    parentId = findParentId(roots, parentId)
  }
  return false
}
const withPointCoordinate = (
  surface: PuppetSpatialSurface,
  pointIndex: number,
  axis: number,
  value: number,
): PuppetSpatialSurface => {
  const controlPoints = [...surface.controlPoints]
  const coordinateIndex = pointIndex * COORDINATES_PER_POINT + axis
  const difference = value - controlPoints[coordinateIndex]!
  controlPoints[pointIndex * COORDINATES_PER_POINT + axis] = value
  const attachments = surface.attachments?.map((attachment, index) => {
    if (index !== pointIndex) {
      return attachment
    }
    const offset: [number, number, number] = [...attachment.offset]
    offset[axis] += difference
    return {...attachment, offset}
  })
  return {...surface, attachments, controlPoints}
}
export const SpatialPartProperties = (props: SpatialPartPropertiesProps) => {
  const [selectedPoint, setSelectedPoint] = createSignal('0')
  const surface = () => props.part.spatial
  const isGrouped = createMemo(() => belongsToSpatialDeformer(props.document, props.part.id))
  const update = (next: PuppetSpatialSurface) => {
    const document = setSpatialSurface({
      document: props.document,
      partId: props.part.id,
      surface: next,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const changePoint = (axis: number, value: number) => {
    const current = surface()
    if (current === undefined) {
      return
    }
    update(withPointCoordinate(current, Number(selectedPoint()), axis, value))
  }
  return (
    <Show when={isGrouped() && surface() !== undefined}>
      <fieldset class="deformer-properties" aria-label="파트 3D 제어점">
        <legend>파트 3D 제어점</legend>
        <Show when={surface()}>
          {(current) => (
            <>
              <EditorSelect
                label="3D 제어점"
                disabled={props.disabled}
                options={Array.from(
                  {length: current().controlPoints.length / COORDINATES_PER_POINT},
                  (_, index) => String(index),
                )}
                value={selectedPoint()}
                onChange={setSelectedPoint}
              />
              <For each={AXES}>
                {(axis, index) => (
                  <label>
                    제어점 {axis}
                    <EditorNumberField
                      disabled={props.disabled}
                      label={`3D 제어점 ${axis}`}
                      step="any"
                      value={
                        current().controlPoints[
                          Number(selectedPoint()) * COORDINATES_PER_POINT + index()
                        ]
                      }
                      onEditEnd={props.onEditEnd}
                      onEditStart={props.onEditStart}
                      onValueChange={(value) => changePoint(index(), value)}
                    />
                  </label>
                )}
              </For>
            </>
          )}
        </Show>
      </fieldset>
    </Show>
  )
}
