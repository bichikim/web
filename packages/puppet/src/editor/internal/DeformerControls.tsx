import {createEffect, Show} from 'solid-js'
import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {DeformerCurveControls} from './DeformerCurveControls'
import type {
  DeformerControlSelection,
  DeformerDragTarget,
  DeformerSelectionModifiers,
} from './deformer-control-selection'
import {DeformerGridControls} from './deformer-controls/DeformerGridControls'
import {DeformerRotationControls} from './deformer-controls/DeformerRotationControls'

export interface DeformerControlsProps {
  readonly controlSelection: DeformerControlSelection
  readonly deformer: PuppetSceneDeformerNode
  readonly onCurveSplit?: (event: MouseEvent) => void
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly moveCurveHandle: (
    pointIndex: number,
    axis: 'horizontal' | 'vertical',
    point: PuppetPoint,
  ) => void
  readonly movePoint: (pointIndex: number, point: PuppetPoint) => void
  readonly origin: PuppetPoint
  readonly radius: number
  readonly startDrag: (event: PointerEvent, target: DeformerDragTarget) => void
  readonly startTranslationDrag: (event: PointerEvent) => void
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

export const DeformerControls = (props: DeformerControlsProps) => {
  createEffect(() => {
    props.controlSelection.syncTopology({
      columns: props.deformer.columns,
      nodeId: props.deformer.id,
      rows: props.deformer.rows,
    })
  })
  const isSelected = (target: DeformerDragTarget) =>
    props.controlSelection.isSelected(props.deformer.id, target)
  const selectTarget = (event: DeformerSelectionModifiers, target: DeformerDragTarget) =>
    props.controlSelection.select(event, props.deformer.id, target)

  return (
    <>
      <DeformerGridControls
        deformer={props.deformer}
        editable={props.editable}
        isSelected={isSelected}
        onCurveSplit={props.onCurveSplit}
        movePoint={props.movePoint}
        radius={props.radius}
        selectTarget={selectTarget}
        startDrag={props.startDrag}
        startTranslationDrag={props.startTranslationDrag}
        transform={props.transform}
      >
        <Show when={props.deformer.curveAxis === undefined}>
          <DeformerRotationControls
            editable={props.editable}
            handle={props.handle}
            isSelected={isSelected}
            origin={props.origin}
            radius={props.radius}
            selectTarget={selectTarget}
            startDrag={props.startDrag}
          />
        </Show>
      </DeformerGridControls>
      <DeformerCurveControls
        deformer={props.deformer}
        editable={props.editable}
        onDragStart={(event, pointIndex, axis) =>
          props.startDrag(event, {axis, kind: 'curveHandle', pointIndex})
        }
        onMove={props.moveCurveHandle}
        radius={props.radius}
        selectedPointIndices={props.controlSelection.selectedPointIndices()}
        transform={props.transform}
      />
    </>
  )
}
