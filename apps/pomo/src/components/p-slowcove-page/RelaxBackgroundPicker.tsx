import {createSignal, Show} from 'solid-js'

import * as m from '@paraglide/message'
import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import {PRelaxBackgroundList} from './PRelaxBackgroundList'
import {RelaxDepthInputPicker} from './RelaxDepthInputPicker'
import {RelaxMistIntensityPicker} from './RelaxMistIntensityPicker'
import type {RelaxDepthInput, RelaxDepthStatus, RelaxWeather} from './types'
import {RelaxWeatherPicker} from './RelaxWeatherPicker'

const PERCENT_SCALE = 100

export interface RelaxBackgroundPickerProps {
  readonly daylightPosition: VirtualLightPosition
  readonly depthInput: RelaxDepthInput
  readonly depthStatus: RelaxDepthStatus
  readonly mistIntensity?: number
  readonly onDaylightPositionChange: (position: VirtualLightPosition) => void
  readonly onDepthInputChange: (input: RelaxDepthInput) => void
  readonly onMistIntensityChange?: (intensity: number) => void
  readonly onSelect: (source: string) => void
  readonly onWeatherChange: (weather: RelaxWeather) => void
  readonly selectedSource: string
  readonly weather: RelaxWeather
}

export const RelaxBackgroundPicker = (props: RelaxBackgroundPickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const handlePress = (source: HTMLButtonElement) => {
    setTrigger(source)
    setIsOpen(true)
  }

  const handlePositionInput = (axis: 'x' | 'y', value: number) =>
    props.onDaylightPositionChange({...props.daylightPosition, [axis]: value / PERCENT_SCALE})

  return (
    <>
      <PButton
        {...GLASS_ICON_BUTTON}
        accessibleLabel={m.relax_background_title()}
        icon="i-tabler-photo"
        onPress={handlePress}
        pill
        tooltip={m.relax_background_title()}
      />
      <Show when={isOpen()}>
        <PModal
          isOpen={isOpen()}
          onCloseAutoFocus={() => trigger()?.focus()}
          onOpenChange={setIsOpen}
          title={m.relax_background_title()}
        >
          <PRelaxBackgroundList onSelect={props.onSelect} selectedSource={props.selectedSource} />
          <RelaxDepthInputPicker
            inputMode={props.depthInput}
            onChange={props.onDepthInputChange}
            status={props.depthStatus}
          />
          <RelaxWeatherPicker onChange={props.onWeatherChange} weather={props.weather} />
          <Show when={props.weather === 'rainy'}>
            <RelaxMistIntensityPicker
              intensity={props.mistIntensity}
              onChange={props.onMistIntensityChange}
            />
          </Show>
          <Show when={props.weather === 'sunny'}>
            <fieldset class="m-0 mt-5 grid gap-4 border-0 p-0">
              <legend class="mb-2 text-sm font-650 text-foreground">
                {m.relax_sunlight_position_title()}
              </legend>
              <label class="grid gap-2 text-sm text-muted-foreground">
                <span class="flex items-center justify-between gap-3">
                  {m.relax_sunlight_horizontal()}
                  <output class="tabular-nums">
                    {Math.round(props.daylightPosition.x * PERCENT_SCALE)}%
                  </output>
                </span>
                <input
                  aria-label={m.relax_sunlight_horizontal()}
                  class="w-full accent-highlight"
                  max="100"
                  min="0"
                  onInput={(event) => handlePositionInput('x', event.currentTarget.valueAsNumber)}
                  step="1"
                  type="range"
                  value={Math.round(props.daylightPosition.x * PERCENT_SCALE)}
                />
              </label>
              <label class="grid gap-2 text-sm text-muted-foreground">
                <span class="flex items-center justify-between gap-3">
                  {m.relax_sunlight_vertical()}
                  <output class="tabular-nums">
                    {Math.round(props.daylightPosition.y * PERCENT_SCALE)}%
                  </output>
                </span>
                <input
                  aria-label={m.relax_sunlight_vertical()}
                  class="w-full accent-highlight"
                  max="100"
                  min="0"
                  onInput={(event) => handlePositionInput('y', event.currentTarget.valueAsNumber)}
                  step="1"
                  type="range"
                  value={Math.round(props.daylightPosition.y * PERCENT_SCALE)}
                />
              </label>
            </fieldset>
          </Show>
        </PModal>
      </Show>
    </>
  )
}
