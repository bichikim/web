import {EditorCheckbox, EditorSelect} from '../../../design-system'
import {createUniqueId} from 'solid-js'
import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_PART_BLEND_MODES,
  type PuppetDocument,
} from '../../../player'
import type {GroupPropertiesController} from './types'

// A select value that cannot collide with a part ID.
const NO_MASK = '\u0000none'

interface GroupOffscreenFieldsProps {
  readonly controller: GroupPropertiesController
  readonly document: PuppetDocument
}

/** Blend modes and clipping mask, which only an offscreen group has. */
export const GroupOffscreenFields = (props: GroupOffscreenFieldsProps) => {
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
