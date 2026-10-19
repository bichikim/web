import {
  EditorCheckbox,
  EditorColorField,
  EditorNumberField,
  EditorSelect,
} from '../../design-system'
import {createUniqueId, Show} from 'solid-js'

import {getGroupRenderProperties, type PuppetParameterValues} from '../../deformation'
import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_MAXIMUM_DRAW_ORDER,
  PUPPET_PART_BLEND_MODES,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetSceneGroupNode,
} from '../../player'
import {colorToHex, hexToColor} from './color-hex'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {
  connectParameterGroup,
  disconnectParameterGroup,
  getKeyformGroupProperties,
  isGroupConnected,
  setKeyformGroupProperties,
} from './group-keyforms'
import {setDrawOrderGroup, setGroupRenderProperties} from './group-properties'

export interface GroupPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly group: PuppetSceneGroupNode
  /** The selected keyform of the active parameter, where keyed opacity and colors are edited. */
  readonly keyform?: {readonly bindingId: string; readonly values: PuppetParameterValues}
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

// A select value that cannot collide with a part ID.
const NO_MASK = '\u0000none'

/** Reads and writes the group's rest properties, or its keyed ones in the selected keyform. */
const createGroupPropertiesController = (props: GroupPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
  }
  const keyed = () => isGroupConnected(props.document, props.keyform?.bindingId, props.group.id)
  const keyedProperties = () =>
    props.keyform === undefined
      ? undefined
      : getKeyformGroupProperties(
          props.document,
          props.keyform.bindingId,
          props.keyform.values,
          props.group.id,
        )
  // Opacity and colors show and edit the selected keyform once the group is keyed.
  const properties = () => ({...getGroupRenderProperties(props.group), ...keyedProperties()})
  const apply = (changes: PuppetGroupRenderProperties) =>
    commit(setGroupRenderProperties(props.document, props.group.id, changes))
  const applyEffect = (
    changes: Pick<
      PuppetGroupRenderProperties,
      'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
    >,
  ) =>
    props.keyform !== undefined && keyed()
      ? commit(
          setKeyformGroupProperties({
            ...props.keyform,
            document: props.document,
            groupId: props.group.id,
            properties: changes,
          }),
        )
      : apply(changes)
  const applyColor = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      applyEffect({[property]: color})
    }
  }
  const setKeyed = (connect: boolean) => {
    const bindingId = props.keyform?.bindingId
    if (bindingId !== undefined) {
      commit(
        (connect ? connectParameterGroup : disconnectParameterGroup)(
          props.document,
          bindingId,
          props.group.id,
        ),
      )
    }
  }

  const toggleDrawOrderGroup = (enabled: boolean) =>
    commit(setDrawOrderGroup(props.document, props.group.id, enabled))
  // The keyed draw order in the selected keyform, else the group's own.
  const drawOrder = () =>
    keyedProperties()?.drawOrder ?? props.group.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER
  return {
    apply,
    applyColor,
    applyEffect,
    disabled,
    drawOrder,
    keyed,
    properties,
    setKeyed,
    toggleDrawOrderGroup,
  }
}

type GroupPropertiesController = ReturnType<typeof createGroupPropertiesController>

/** Blend modes and clipping mask, which only an offscreen group has. */
const OffscreenFields = (props: {
  readonly controller: GroupPropertiesController
  readonly document: PuppetDocument
}) => {
  const invertedId = createUniqueId()
  return (
    <>
      <label>
        블렌드 모드
        <EditorSelect
          disabled={props.controller.disabled()}
          label="그룹 블렌드 모드"
          options={PUPPET_PART_BLEND_MODES}
          value={props.controller.properties().blendMode}
          onChange={(blendMode) => {
            const mode = PUPPET_PART_BLEND_MODES.find((candidate) => candidate === blendMode)
            if (mode !== undefined) {
              props.controller.apply({blendMode: mode})
            }
          }}
        />
      </label>
      <label>
        알파 합성
        <EditorSelect
          disabled={props.controller.disabled()}
          label="그룹 알파 합성"
          options={PUPPET_ALPHA_BLEND_MODES}
          value={props.controller.properties().alphaBlendMode}
          onChange={(alphaBlendMode) => {
            const mode = PUPPET_ALPHA_BLEND_MODES.find((candidate) => candidate === alphaBlendMode)
            if (mode !== undefined) {
              props.controller.apply({alphaBlendMode: mode})
            }
          }}
        />
      </label>
      <label>
        클리핑 마스크
        <EditorSelect
          disabled={props.controller.disabled()}
          label="그룹 클리핑 마스크"
          optionLabel={(value) => (value === NO_MASK ? '없음' : value)}
          options={[NO_MASK, ...props.document.parts.map((part) => part.id)]}
          value={props.controller.properties().clippingMaskIds[0] ?? NO_MASK}
          onChange={(value) =>
            props.controller.apply({clippingMaskIds: value === NO_MASK ? [] : [value]})
          }
        />
      </label>
      <div class="editor-color-row">
        <label for={invertedId}>마스크 반전</label>
        <EditorCheckbox
          checked={props.controller.properties().invertedMask}
          disabled={
            props.controller.disabled() ||
            props.controller.properties().clippingMaskIds.length === 0
          }
          inputId={invertedId}
          label="그룹 마스크 반전"
          onChange={(invertedMask) => props.controller.apply({invertedMask})}
        />
      </div>
    </>
  )
}

/**
 * Whether the group sorts as one draw order unit (Cubism's grouped part), and its draw order.
 * Offscreen groups always do.
 */
const DrawOrderFields = (props: {
  readonly controller: GroupPropertiesController
  readonly group: PuppetSceneGroupNode
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}) => {
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
      <DrawOrderFields
        controller={controller}
        group={props.group}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
      />
      <div class="editor-color-row">
        <label for={offscreenId}>오프스크린 합성</label>
        <EditorCheckbox
          checked={properties().offscreen}
          disabled={disabled()}
          inputId={offscreenId}
          label="오프스크린 합성"
          onChange={(offscreen) => apply({offscreen})}
        />
      </div>
      <Show
        when={properties().offscreen}
        fallback={
          <p class="parameter-section-summary">
            불투명도와 색상을 하위 파트마다 곱합니다. 오프스크린 합성을 켜면 하위 파트를 한 장으로
            합친 뒤 적용하고 블렌드·마스크를 쓸 수 있습니다.
          </p>
        }
      >
        <OffscreenFields controller={controller} document={props.document} />
      </Show>
    </EditorPropertyGroup>
  )
}
