import {createSignal, For, Show} from 'solid-js'

import * as m from '@paraglide/message'
import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import {PSwitch} from '../p-switch/PSwitch'
import {RELAX_BACKGROUND_OPTIONS} from './background-options'
import {RelaxDepthInputPicker} from './RelaxDepthInputPicker'
import {RelaxMistIntensityPicker} from './RelaxMistIntensityPicker'
import type {RelaxDepthInput, RelaxDepthStatus, RelaxWeather} from './types'
import {RelaxWeatherPicker} from './RelaxWeatherPicker'
import type {DaylightTiltStatus} from './use-daylight-tilt'

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
  readonly onTiltEnabledChange: (enabled: boolean) => void
  readonly selectedSource: string
  readonly tiltEnabled: boolean
  readonly tiltStatus: DaylightTiltStatus
  readonly weather: RelaxWeather
}

const getTiltStatusMessage = (status: DaylightTiltStatus) => {
  switch (status) {
    case 'off':
    case 'active':
      return null
    case 'requesting':
      return m.relax_tilt_requesting()
    case 'waiting':
      return m.relax_tilt_waiting()
    case 'denied':
      return m.relax_tilt_denied()
    case 'unavailable':
      return m.relax_tilt_unavailable()
  }
  const exhaustive: never = status
  return exhaustive
}

export const RelaxBackgroundPicker = (props: RelaxBackgroundPickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)

  const handlePress = (source: HTMLButtonElement) => {
    setTrigger(source)
    setIsOpen(true)
  }

  const handleSelect = (source: string) => {
    props.onSelect(source)
    setIsOpen(false)
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
          <div
            aria-label={m.relax_background_title()}
            class="grid grid-cols-2 gap-3"
            role="radiogroup"
          >
            <For each={RELAX_BACKGROUND_OPTIONS}>
              {(background) => (
                <label class="cursor-pointer">
                  <input
                    checked={props.selectedSource === background.source}
                    class="peer sr-only"
                    name="relax-background"
                    onChange={() => handleSelect(background.source)}
                    type="radio"
                    value={background.source}
                  />
                  <span
                    class="block overflow-hidden rounded-panel border border-solid border-border
                      bg-surface-strong text-foreground transition-colors
                      peer-checked:border-highlight peer-focus-visible:shadow-focus"
                  >
                    <img alt="" class="aspect-video w-full object-cover" src={background.source} />
                    <span class="flex items-center justify-between gap-2 px-3 py-2 text-sm font-650">
                      <span>{background.label()}</span>
                      <Show when={props.selectedSource === background.source}>
                        <span aria-hidden="true" class="i-tabler-check size-4" />
                      </Show>
                    </span>
                  </span>
                </label>
              )}
            </For>
          </div>
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
            <div class="mt-5 border-t border-solid border-border pt-4">
              <PSwitch
                checked={props.tiltEnabled}
                description={m.relax_tilt_description()}
                label={m.relax_tilt_label()}
                onChange={props.onTiltEnabledChange}
              />
              <Show when={getTiltStatusMessage(props.tiltStatus)}>
                {(message) => (
                  <p
                    aria-label={m.relax_tilt_status()}
                    class="mt-2 text-sm text-muted-foreground"
                    role="status"
                  >
                    {message()}
                  </p>
                )}
              </Show>
            </div>
          </Show>
        </PModal>
      </Show>
    </>
  )
}
