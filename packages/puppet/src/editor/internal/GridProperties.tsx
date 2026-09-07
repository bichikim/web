import {Show} from 'solid-js'
import type {PuppetSceneDeformerNode} from '../../player'
import {EditorNumberField} from './EditorNumberField'
import {MAXIMUM_GRID_DIVISIONS, MINIMUM_GRID_DIVISIONS} from './grid-control-points'

interface GridPropertiesProps {
  readonly node: PuppetSceneDeformerNode
  readonly resolutionEditingDisabled: boolean
  readonly onDivisionChange: (axis: 'columns' | 'rows', value: number) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export const GridProperties = (props: GridPropertiesProps) => (
  <Show
    when={
      props.node.curveAxis === undefined &&
      props.node.boneRestPoints === undefined &&
      props.node.pins === undefined
    }
  >
    <fieldset class="deformer-properties">
      <legend>격자</legend>
      <div class="grid-resolution">
        <label>
          가로 칸
          <EditorNumberField
            disabled={props.resolutionEditingDisabled}
            label="격자 가로 칸"
            maximum={MAXIMUM_GRID_DIVISIONS}
            minimum={MINIMUM_GRID_DIVISIONS}
            name="deformer-columns"
            step={1}
            value={props.node.columns}
            onValueChange={(value) => props.onDivisionChange('columns', value)}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
          />
        </label>
        <label>
          세로 칸
          <EditorNumberField
            disabled={props.resolutionEditingDisabled}
            label="격자 세로 칸"
            maximum={MAXIMUM_GRID_DIVISIONS}
            minimum={MINIMUM_GRID_DIVISIONS}
            name="deformer-rows"
            step={1}
            value={props.node.rows}
            onValueChange={(value) => props.onDivisionChange('rows', value)}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
          />
        </label>
      </div>
    </fieldset>
  </Show>
)
