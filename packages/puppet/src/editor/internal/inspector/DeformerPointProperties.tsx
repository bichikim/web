import {EditorButton, EditorNumberField} from '../../../design-system'
import {Show} from 'solid-js'
import {type PuppetSceneDeformerNode} from '../../../player'

export interface DeformerPointPropertiesProps {
  readonly curveEditingDisabled: boolean
  readonly node: PuppetSceneDeformerNode
  readonly onCurveToggle: (pointIndex: number, hasHandle: boolean) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onPointChange: (pointIndex: number, axis: 'x' | 'y', value: number) => void
  readonly pointEditingDisabled: boolean
  readonly pointIndex: number
}

export const DeformerPointProperties = (props: DeformerPointPropertiesProps) => {
  const hasHandle = () =>
    props.node.curveHandles?.some((handle) => handle.pointIndex === props.pointIndex) === true

  return (
    <fieldset class="deformer-properties grid-points">
      <legend>선택한 제어점 {props.pointIndex + 1}</legend>
      <div class="grid-point-row">
        <EditorNumberField
          step="any"
          disabled={props.pointEditingDisabled}
          label={`${props.node.curveAxis === undefined ? '격자' : '곡선'} 제어점 ${props.pointIndex + 1} X`}
          name={`deformer-point-${props.pointIndex + 1}-x`}
          value={props.node.controlPoints[props.pointIndex * 2]}
          onValueChange={(value) => props.onPointChange(props.pointIndex, 'x', value)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
        <EditorNumberField
          step="any"
          disabled={props.pointEditingDisabled}
          label={`${props.node.curveAxis === undefined ? '격자' : '곡선'} 제어점 ${props.pointIndex + 1} Y`}
          name={`deformer-point-${props.pointIndex + 1}-y`}
          value={props.node.controlPoints[props.pointIndex * 2 + 1]}
          onValueChange={(value) => props.onPointChange(props.pointIndex, 'y', value)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
        <Show
          when={
            props.node.curveAxis === undefined &&
            props.node.boneRestPoints === undefined &&
            props.node.pins === undefined
          }
        >
          <EditorButton
            aria-label={`격자 제어점 ${props.pointIndex + 1} 곡률 핸들 ${hasHandle() ? '삭제' : '추가'}`}
            class="grid-curve-button"
            disabled={props.curveEditingDisabled || props.node.curveAxis !== undefined}
            type="button"
            onClick={() => props.onCurveToggle(props.pointIndex, hasHandle())}
          >
            곡률{' '}
            <Show
              when={hasHandle()}
              fallback={<span aria-hidden="true" class="puppet-icon puppet-icon-plus" />}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-minus" />
            </Show>
          </EditorButton>
        </Show>
      </div>
    </fieldset>
  )
}
