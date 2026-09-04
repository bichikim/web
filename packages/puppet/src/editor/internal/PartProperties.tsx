import {For} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import {
  PUPPET_PART_BLEND_MODES,
  type PuppetColor,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetPartRenderProperties,
} from '../../player'

type InterpolatedPartProperties = Pick<
  PuppetPartRenderProperties,
  'multiplyColor' | 'opacity' | 'screenColor'
>

export interface PartPropertiesProps {
  readonly interpolatedDisabled: boolean
  readonly maskPartOptions: ReadonlyArray<PartMaskOption>
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly onInterpolatedChange: (properties: InterpolatedPartProperties) => void
  readonly onStaticChange: (properties: PuppetPartRenderProperties) => void
}

export interface PartMaskOption {
  readonly disabled: boolean
  readonly part: PuppetPart
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
  const handleOpacityInput = (value: string) => {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0 || number > 1) {
      return
    }
    props.onInterpolatedChange({opacity: number})
  }
  const handleColorInput = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      props.onInterpolatedChange({[property]: color})
    }
  }
  const handleMaskChange = (partId: string, checked: boolean) => {
    const maskIds = properties().clippingMaskIds
    props.onStaticChange({
      clippingMaskIds: checked ? [...maskIds, partId] : maskIds.filter((id) => id !== partId),
    })
  }

  return (
    <fieldset class="deformer-properties part-properties">
      <legend>파트 렌더링</legend>
      <label>
        불투명도
        <input
          aria-label="파트 불투명도"
          disabled={props.interpolatedDisabled}
          max={1}
          min={0}
          name="part-opacity"
          step={0.01}
          type="number"
          value={properties().opacity}
          onInput={(event) => handleOpacityInput(event.currentTarget.value)}
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
          disabled={props.interpolatedDisabled}
          type="color"
          value={colorToHex(properties().multiplyColor)}
          onInput={(event) => handleColorInput('multiplyColor', event.currentTarget.value)}
        />
      </label>
      <label>
        스크린 색상
        <input
          aria-label="파트 스크린 색상"
          disabled={props.interpolatedDisabled}
          type="color"
          value={colorToHex(properties().screenColor)}
          onInput={(event) => handleColorInput('screenColor', event.currentTarget.value)}
        />
      </label>
      <fieldset class="part-mask-properties">
        <legend>클리핑 마스크</legend>
        <For each={props.maskPartOptions}>
          {(option) => (
            <label
              title={
                option.disabled ? '이 파트를 마스크로 지정하면 순환 참조가 생깁니다.' : undefined
              }
            >
              <input
                checked={properties().clippingMaskIds.includes(option.part.id)}
                disabled={props.staticDisabled || option.disabled}
                type="checkbox"
                onChange={(event) => handleMaskChange(option.part.id, event.currentTarget.checked)}
              />
              {option.part.id}로 자르기
            </label>
          )}
        </For>
        <label>
          <input
            checked={properties().invertedMask}
            disabled={props.staticDisabled}
            type="checkbox"
            onChange={(event) => props.onStaticChange({invertedMask: event.currentTarget.checked})}
          />
          마스크 반전
        </label>
      </fieldset>
      <fieldset class="part-mask-properties">
        <legend>마스크로 사용될 때</legend>
        <label>
          <input
            checked={properties().renderWhenUsedAsMask}
            disabled={props.staticDisabled}
            type="checkbox"
            onChange={(event) =>
              props.onStaticChange({renderWhenUsedAsMask: event.currentTarget.checked})
            }
          />
          파츠도 계속 표시
        </label>
      </fieldset>
    </fieldset>
  )
}
