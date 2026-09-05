import {For} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import {
  PUPPET_PART_BLEND_MODES,
  type PuppetColor,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetPartRenderProperties,
} from '../../player'
import {EditorNumberField} from './EditorNumberField'
import {type PartMaskOption, PartMaskProperties} from './PartMaskProperties'

export type {PartMaskOption} from './PartMaskProperties'

type InterpolatedPartProperties = Pick<
  PuppetPartRenderProperties,
  'multiplyColor' | 'opacity' | 'screenColor'
>

export interface PartPropertiesProps {
  readonly maskPartOptions: ReadonlyArray<PartMaskOption>
  readonly maskPicking?: boolean
  readonly maskUsageCount?: number
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly visualDisabled: boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onInterpolatedChange: (properties: InterpolatedPartProperties) => void
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
        <select
          aria-label="파트 블렌드 모드"
          disabled={props.staticDisabled}
          value={properties().blendMode}
          onChange={(event) => {
            const blendMode = event.currentTarget.value
            if (isPartBlendMode(blendMode)) {
              props.onStaticChange({blendMode})
            }
          }}
        >
          <For each={PUPPET_PART_BLEND_MODES}>
            {(blendMode) => <option value={blendMode}>{blendMode}</option>}
          </For>
        </select>
      </label>
      <label>
        곱하기 색상
        <input
          aria-label="파트 곱하기 색상"
          disabled={props.visualDisabled}
          type="color"
          value={colorToHex(properties().multiplyColor)}
          onInput={(event) => handleColorInput('multiplyColor', event.currentTarget.value)}
        />
      </label>
      <label>
        스크린 색상
        <input
          aria-label="파트 스크린 색상"
          disabled={props.visualDisabled}
          type="color"
          value={colorToHex(properties().screenColor)}
          onInput={(event) => handleColorInput('screenColor', event.currentTarget.value)}
        />
      </label>
      <PartMaskProperties
        maskPartOptions={props.maskPartOptions}
        maskPicking={props.maskPicking}
        maskUsageCount={props.maskUsageCount}
        part={props.part}
        staticDisabled={props.staticDisabled}
        onMaskPickCancel={props.onMaskPickCancel}
        onMaskPickStart={props.onMaskPickStart}
        onStaticChange={props.onStaticChange}
      />
    </fieldset>
  )
}
