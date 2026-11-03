import {EditorCheckbox, EditorNumberField} from '../../../design-system'
import {Show} from 'solid-js'
import {PUPPET_MAXIMUM_DRAW_ORDER, type PuppetSceneGroupNode} from '../../../player'
import type {GroupPropertiesController} from './types'

interface GroupDrawOrderFieldsProps {
  readonly controller: GroupPropertiesController
  readonly group: PuppetSceneGroupNode
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

/**
 * Whether the group sorts as one draw order unit (Cubism's grouped part), and its draw order.
 * Offscreen groups always do.
 */
export const GroupDrawOrderFields = (props: GroupDrawOrderFieldsProps) => {
  const grouped = () => props.group.properties?.drawOrder !== undefined
  return (
    <>
      <div class="editor-color-row">
        <span>그리기 순서 그룹</span>
        <EditorCheckbox
          checked={grouped()}
          disabled={props.controller.disabled()}
          label="그리기 순서 그룹"
          onChange={props.controller.toggleDrawOrderGroup}
        />
      </div>
      <Show when={grouped() || props.controller.properties().offscreen}>
        <label>
          그리기 순서
          <EditorNumberField
            disabled={props.controller.disabled()}
            label="그룹 그리기 순서"
            maximum={PUPPET_MAXIMUM_DRAW_ORDER}
            minimum={0}
            name={`${props.group.id}-draw-order`}
            step={1}
            value={props.controller.drawOrder()}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(drawOrder) => props.controller.applyEffect({drawOrder})}
          />
        </label>
      </Show>
    </>
  )
}
