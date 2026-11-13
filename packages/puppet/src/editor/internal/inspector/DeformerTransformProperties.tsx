import {EditorNumberField} from '../../../design-system'
import {Show} from 'solid-js'
import {type PuppetSceneDeformerNode} from '../../../player'
import {getDeformerAngle, getDeformerRotationOrigin} from '../deformer-transform'
import type {TransformProperty} from './types'

export interface DeformerTransformPropertiesProps {
  readonly disabled: boolean
  readonly node: PuppetSceneDeformerNode
  readonly onChange: (property: TransformProperty, value: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export const DeformerTransformProperties = (props: DeformerTransformPropertiesProps) => (
  <Show
    when={
      props.node.curveAxis === undefined &&
      props.node.boneRestPoints === undefined &&
      props.node.pins === undefined
    }
  >
    <fieldset class="deformer-properties">
      <legend>회전</legend>
      <label>
        각도
        <EditorNumberField
          step="any"
          disabled={props.disabled}
          label="자유 변형 각도"
          name="deformer-angle"
          value={getDeformerAngle(props.node)}
          onValueChange={(value) => props.onChange('angle', value)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
      </label>
      <label>
        회전 중심 X
        <EditorNumberField
          step="any"
          disabled={props.disabled}
          label="자유 변형 회전 중심 X"
          name="deformer-rotation-origin-x"
          value={getDeformerRotationOrigin(props.node).x}
          onValueChange={(value) => props.onChange('rotationOriginX', value)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
      </label>
      <label>
        회전 중심 Y
        <EditorNumberField
          step="any"
          disabled={props.disabled}
          label="자유 변형 회전 중심 Y"
          name="deformer-rotation-origin-y"
          value={getDeformerRotationOrigin(props.node).y}
          onValueChange={(value) => props.onChange('rotationOriginY', value)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
      </label>
    </fieldset>
  </Show>
)
