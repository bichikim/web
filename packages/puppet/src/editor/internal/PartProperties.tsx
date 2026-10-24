import {
  EditorCheckbox,
  EditorColorField,
  EditorNumberField,
  EditorSelect,
} from '../../design-system'
import {For, Show} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_MAXIMUM_DRAW_ORDER,
  PUPPET_PART_BLEND_MODES,
  type PuppetAlphaBlendMode,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetPartRenderProperties,
} from '../../player'
import {type MaskTargetOption, PartMaskProperties} from './PartMaskProperties'
import {SpatialPartProperties} from './SpatialPartProperties'
import {PartPresetProperties} from './PartPresetProperties'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {colorToHex, hexToColor} from './color-hex'
import {EditorInspectorActions} from './EditorInspectorActions'
import {CommitTextField} from './CommitTextField'
import {setPartUserData} from './part-user-data'

export type {MaskTargetOption} from './PartMaskProperties'

type InterpolatedPartProperties = Pick<
  PuppetPartRenderProperties,
  'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
>

export interface PartPropertiesProps {
  readonly autoMeshAvailable?: boolean
  readonly document?: PuppetDocument
  readonly maskTargetOptions: ReadonlyArray<MaskTargetOption>
  readonly maskPicking?: boolean
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly spatialDisabled?: boolean
  readonly visualDisabled: boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onAutoMesh?: () => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onInterpolatedChange: (properties: InterpolatedPartProperties) => void
  readonly onMaskTargetChange?: (partId: string, checked: boolean) => void
  readonly onMaskPickCancel?: () => void
  readonly onMaskPickStart?: (partId: string) => void
  readonly onStaticChange: (properties: PuppetPartRenderProperties) => void
}

const isPartBlendMode = (value: string): value is PuppetPartBlendMode =>
  PUPPET_PART_BLEND_MODES.some((blendMode) => blendMode === value)

const isAlphaBlendMode = (value: string): value is PuppetAlphaBlendMode =>
  PUPPET_ALPHA_BLEND_MODES.some((alphaBlendMode) => alphaBlendMode === value)

/** Free text an app reads for the part (Cubism's userdata3). */
const PartUserDataProperties = (props: {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly part: PuppetPart
  readonly onDocumentChange?: (document: PuppetDocument) => void
}) => (
  <EditorPropertyGroup class="part-properties" title="사용자 데이터">
    <CommitTextField
      disabled={props.disabled}
      label="파트 사용자 데이터"
      placeholder="앱에 전달할 문자열"
      value={props.part.userData ?? ''}
      onCommit={(text) =>
        props.onDocumentChange?.(setPartUserData(props.document, props.part.id, text))
      }
    />
  </EditorPropertyGroup>
)

export const PartProperties = (props: PartPropertiesProps) => {
  const properties = () => getPartRenderProperties(props.part)
  const handleColorInput = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      props.onInterpolatedChange({[property]: color})
    }
  }

  return (
    <>
      <EditorPropertyGroup class="part-properties" title="파트 렌더링">
        <EditorInspectorActions
          autoMeshAvailable={props.autoMeshAvailable}
          onAutoMesh={props.onAutoMesh}
        />
        <label>
          불투명도
          <EditorNumberField
            disabled={props.visualDisabled}
            label="파트 불투명도"
            maximum={1}
            minimum={0}
            name="part-opacity"
            step={0.01}
            value={properties().opacity}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(opacity) => props.onInterpolatedChange({opacity})}
          />
        </label>
        <label>
          그리기 순서
          <EditorNumberField
            disabled={props.visualDisabled}
            label="파트 그리기 순서"
            maximum={PUPPET_MAXIMUM_DRAW_ORDER}
            minimum={0}
            name="part-draw-order"
            step={1}
            value={props.part.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(drawOrder) => props.onInterpolatedChange({drawOrder})}
          />
        </label>
        <label>
          블렌드 모드
          <EditorSelect
            label="파트 블렌드 모드"
            disabled={props.staticDisabled}
            value={properties().blendMode}
            options={PUPPET_PART_BLEND_MODES}
            onChange={(blendMode) => {
              if (isPartBlendMode(blendMode)) {
                props.onStaticChange({blendMode})
              }
            }}
          />
        </label>
        <label>
          알파 합성
          <EditorSelect
            label="파트 알파 합성"
            disabled={props.staticDisabled}
            value={properties().alphaBlendMode}
            options={PUPPET_ALPHA_BLEND_MODES}
            onChange={(alphaBlendMode) => {
              if (isAlphaBlendMode(alphaBlendMode)) {
                props.onStaticChange({alphaBlendMode})
              }
            }}
          />
        </label>
        <div class="editor-color-row">
          <span>컬링</span>
          <EditorCheckbox
            checked={properties().culling}
            disabled={props.staticDisabled}
            label="뒤집힌 면 숨기기"
            onChange={(culling) => props.onStaticChange({culling})}
          />
        </div>
        <div class="editor-color-row">
          <span>곱하기 색상</span>
          <EditorColorField
            label="파트 곱하기 색상"
            disabled={props.visualDisabled}
            value={colorToHex(properties().multiplyColor)}
            onEditStart={props.onEditStart}
            onEditEnd={props.onEditEnd}
            onValueChange={(value) => handleColorInput('multiplyColor', value)}
          />
        </div>
        <div class="editor-color-row">
          <span>스크린 색상</span>
          <EditorColorField
            label="파트 스크린 색상"
            disabled={props.visualDisabled}
            value={colorToHex(properties().screenColor)}
            onEditStart={props.onEditStart}
            onEditEnd={props.onEditEnd}
            onValueChange={(value) => handleColorInput('screenColor', value)}
          />
        </div>
        <PartMaskProperties
          maskTargetOptions={props.maskTargetOptions}
          maskPicking={props.maskPicking}
          part={props.part}
          staticDisabled={props.staticDisabled}
          onMaskTargetChange={props.onMaskTargetChange}
          onMaskPickCancel={props.onMaskPickCancel}
          onMaskPickStart={props.onMaskPickStart}
          onStaticChange={props.onStaticChange}
        />
      </EditorPropertyGroup>
      <Show when={props.document}>
        {(document) => (
          <>
            <SpatialPartProperties
              disabled={props.spatialDisabled}
              document={document()}
              part={props.part}
              onDocumentChange={props.onDocumentChange}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
            />
            <PartPresetProperties
              disabled={props.staticDisabled}
              document={document()}
              part={props.part}
              onDocumentChange={props.onDocumentChange}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
            />
            <PartUserDataProperties
              disabled={props.staticDisabled || props.onDocumentChange === undefined}
              document={document()}
              part={props.part}
              onDocumentChange={props.onDocumentChange}
            />
          </>
        )}
      </Show>
    </>
  )
}
