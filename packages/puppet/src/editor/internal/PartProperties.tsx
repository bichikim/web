import {EditorSelect} from './EditorSelect'
import {For} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import {
  PUPPET_PART_BLEND_MODES,
  type PuppetColor,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetPartRenderProperties,
} from '../../player'
import {EditorColorField} from './EditorColorField'
import {EditorNumberField} from './EditorNumberField'
import {type MaskTargetOption, PartMaskProperties} from './PartMaskProperties'

export type {MaskTargetOption} from './PartMaskProperties'

type InterpolatedPartProperties = Pick<
  PuppetPartRenderProperties,
  'multiplyColor' | 'opacity' | 'screenColor'
>

export interface PartPropertiesProps {
  readonly maskTargetOptions: ReadonlyArray<MaskTargetOption>
  readonly maskPicking?: boolean
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly visualDisabled: boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onInterpolatedChange: (properties: InterpolatedPartProperties) => void
  readonly onMaskTargetChange?: (partId: string, checked: boolean) => void
  readonly onMaskPickCancel?: () => void
  readonly onMaskPickStart?: (partId: string) => void
  readonly onStaticChange: (properties: PuppetPartRenderProperties) => void
}

const COLOR_CHANNEL_MAXIMUM = 255
const HEX_RADIX = 16
const HEX_COLOR_PATTERN = /^#(?<red>[\da-f]{2})(?<green>[\da-f]{2})(?<blue>[\da-f]{2})$/iu

const colorToHex = (color: PuppetColor) =>
  `#${color
    .map((channel) =>
      Math.round(channel * COLOR_CHANNEL_MAXIMUM)
        .toString(HEX_RADIX)
        .padStart(2, '0'),
    )
    .join('')}`

const hexToColor = (value: string): PuppetColor | undefined => {
  const groups = HEX_COLOR_PATTERN.exec(value)?.groups
  return groups === undefined
    ? undefined
    : [
        Number.parseInt(groups.red!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
        Number.parseInt(groups.green!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
        Number.parseInt(groups.blue!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
      ]
}

const isPartBlendMode = (value: string): value is PuppetPartBlendMode =>
  PUPPET_PART_BLEND_MODES.some((blendMode) => blendMode === value)

export const PartProperties = (props: PartPropertiesProps) => {
  const properties = () => getPartRenderProperties(props.part)
  const handleColorInput = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      props.onInterpolatedChange({[property]: color})
    }
  }

  return (
    <fieldset class="deformer-properties part-properties">
      <legend>파트 렌더링</legend>
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
    </fieldset>
  )
}
