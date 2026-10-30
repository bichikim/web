import {EditorCheckbox, EditorColorField, EditorNumberField} from '../../design-system'
import {createUniqueId, Show} from 'solid-js'
import {colorToHex} from './color-hex'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import type {GroupPropertiesProps} from './group-properties/types'
import {createGroupPropertiesController} from './group-properties/create-group-properties-controller'
import {GroupDrawOrderFields} from './group-properties/GroupDrawOrderFields'
import {GroupOffscreenFields} from './group-properties/GroupOffscreenFields'

/**
 * Opacity and colors of a group, and whether it is drawn as an isolated (offscreen) layer with
 * its own blend modes and clipping mask.
 */
export const GroupProperties = (props: GroupPropertiesProps) => {
  const offscreenId = createUniqueId()
  const keyedId = createUniqueId()
  const controller = createGroupPropertiesController(props)
  const {apply, applyColor, applyEffect, disabled, keyed, properties, setKeyed} = controller

  return (
    <EditorPropertyGroup class="group-properties" title="그룹 렌더링">
      <Show when={props.keyform}>
        <div class="editor-color-row">
          <label for={keyedId}>파라미터 키폼</label>
          <EditorCheckbox
            checked={keyed()}
            disabled={disabled()}
            inputId={keyedId}
            label="그룹 불투명도·색상을 활성 파라미터에 키로 연결"
            onChange={setKeyed}
          />
        </div>
      </Show>
      <label>
        불투명도
        <EditorNumberField
          disabled={disabled()}
          label="그룹 불투명도"
          maximum={1}
          minimum={0}
          name={`${props.group.id}-opacity`}
          step={0.01}
          value={properties().opacity}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onValueChange={(opacity) => applyEffect({opacity})}
        />
      </label>
      <div class="editor-color-row">
        <span>곱하기 색상</span>
        <EditorColorField
          disabled={disabled()}
          label="그룹 곱하기 색상"
          value={colorToHex(properties().multiplyColor)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onValueChange={(value) => applyColor('multiplyColor', value)}
        />
      </div>
      <div class="editor-color-row">
        <span>스크린 색상</span>
        <EditorColorField
          disabled={disabled()}
          label="그룹 스크린 색상"
          value={colorToHex(properties().screenColor)}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onValueChange={(value) => applyColor('screenColor', value)}
        />
      </div>
      <GroupDrawOrderFields
        controller={controller}
        group={props.group}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
      />
      <div class="editor-color-row">
        <label
          data-tooltip="꺼져 있으면 불투명도와 색상을 하위 파트마다 곱합니다. 켜면 하위 파트를 한 장으로 합친 뒤 적용하고 블렌드·마스크를 쓸 수 있습니다."
          for={offscreenId}
        >
          오프스크린 합성
        </label>
        <EditorCheckbox
          checked={properties().offscreen}
          disabled={disabled()}
          inputId={offscreenId}
          label="오프스크린 합성"
          onChange={(offscreen) => apply({offscreen})}
        />
      </div>
      <Show when={properties().offscreen}>
        <GroupOffscreenFields controller={controller} document={props.document} />
      </Show>
    </EditorPropertyGroup>
  )
}

export type {GroupPropertiesProps} from './group-properties/types'
