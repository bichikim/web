import {ColorArea} from '@kobalte/core/color-area'
import {ColorField} from '@kobalte/core/color-field'
import {ColorSlider} from '@kobalte/core/color-slider'
import {ColorSwatch} from '@kobalte/core/color-swatch'
import {parseColor} from '@kobalte/core/colors'
import {Popover} from '@kobalte/core/popover'
import {createEffect, createSignal, untrack} from 'solid-js'

export interface EditorColorFieldProps {
  readonly label: string
  readonly value: string
  readonly disabled?: boolean
  readonly onValueChange: (value: string) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}

export const EditorColorField = (props: EditorColorFieldProps) => {
  const [color, setColor] = createSignal(untrack(() => parseColor(props.value).toFormat('hsb')))
  createEffect(() => {
    const value = parseColor(props.value)
    if (value.toString('hex') !== untrack(color).toString('hex')) {
      setColor(value.toFormat('hsb'))
    }
  })
  const handleChange = (value: ReturnType<typeof parseColor>) => {
    setColor(value.toFormat('hsb'))
    props.onValueChange(value.toString('hex'))
  }

  return (
    <div class="editor-color-field">
      <Popover onOpenChange={(open) => (open ? props.onEditStart?.() : props.onEditEnd?.())}>
        <Popover.Trigger
          class="editor-color-trigger"
          aria-label={`${props.label} 선택`}
          disabled={props.disabled}
        >
          <ColorSwatch class="editor-color-swatch" value={color()} />
        </Popover.Trigger>
        <Popover.Content class="mask-picker editor-color-picker">
          <div class="mask-picker-heading">
            <Popover.Title>{props.label}</Popover.Title>
            <Popover.CloseButton aria-label="색상 선택기 닫기">
              <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
            </Popover.CloseButton>
          </div>
          <ColorArea
            value={color()}
            onChange={handleChange}
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
            disabled={props.disabled}
          >
            <ColorArea.Label>채도 · 명도</ColorArea.Label>
            <ColorArea.Background class="editor-color-area">
              <ColorArea.Thumb class="editor-color-thumb">
                <ColorArea.HiddenInputX aria-label="채도" />
                <ColorArea.HiddenInputY aria-label="명도" />
              </ColorArea.Thumb>
            </ColorArea.Background>
          </ColorArea>
          <ColorSlider
            value={color()}
            onChange={handleChange}
            channel="hue"
            disabled={props.disabled}
          >
            <ColorSlider.Label>색조</ColorSlider.Label>
            <ColorSlider.Track class="editor-color-track">
              <ColorSlider.Thumb class="editor-color-thumb">
                <ColorSlider.Input aria-label="색조" />
              </ColorSlider.Thumb>
            </ColorSlider.Track>
          </ColorSlider>
        </Popover.Content>
      </Popover>
      <ColorField
        value={props.value}
        disabled={props.disabled}
        onChange={(value) => {
          if (/^#[\da-f]{6}$/iu.test(value)) {
            handleChange(parseColor(value))
          }
        }}
      >
        <ColorField.Input
          aria-label={props.label}
          onFocus={() => props.onEditStart?.()}
          onBlur={() => props.onEditEnd?.()}
        />
      </ColorField>
    </div>
  )
}
