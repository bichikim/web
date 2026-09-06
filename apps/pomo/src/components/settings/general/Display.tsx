import {FIELD_DESCRIPTION} from 'src/components/field-classes'
import {createMemo, Show} from 'solid-js'
import {PSelect, type PSelectOption} from '../../PSelect'
import {PSwitch} from '../../PSwitch'
import {useFullscreen} from '../../../features/fullscreen'
import type {ScreenSaverDelay} from '../../../features/screen-saver'
import {type ScreenWakeLockController} from '../../../features/screen-wake-lock'
import * as m from '@paraglide/message'
import {CLASSES, type PSettingsProps} from './shared'

const getScreenSaverDelayOptions = () =>
  [
    {label: m.settings_delay_off(), value: 'off'},
    ...(import.meta.env.DEV
      ? ([{label: m.settings_delay_five_seconds(), value: '5s'}] as const)
      : []),
    {label: m.settings_delay_one_minute(), value: '1m'},
    {label: m.settings_delay_ten_minutes(), value: '10m'},
    {label: m.settings_delay_twenty_minutes(), value: '20m'},
    {label: m.settings_delay_one_hour(), value: '1h'},
  ] satisfies readonly PSelectOption<ScreenSaverDelay>[]

interface PGeneralDisplaySettingsProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
}

export const PGeneralDisplaySettings = (props: PGeneralDisplaySettingsProps) => {
  const fullscreen = useFullscreen()
  const fullscreenDescription = createMemo(() => {
    const error = fullscreen.error()
    if (error !== null) {
      switch (error) {
        case 'enter-failed':
          return m.settings_fullscreen_enter_failed()
        case 'exit-failed':
          return m.settings_fullscreen_exit_failed()
      }

      const exhaustiveError: never = error
      return exhaustiveError
    }

    const availability = fullscreen.availability()
    switch (availability) {
      case 'checking':
        return m.settings_fullscreen_checking()
      case 'supported':
        return fullscreen.isRequestPending()
          ? m.settings_fullscreen_requesting()
          : m.settings_fullscreen_supported()
      case 'unsupported':
        return m.settings_fullscreen_unsupported()
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const wakeLockDescription = createMemo(() => {
    const errorMessage = props.wakeLock.errorMessage()

    if (errorMessage !== null) {
      return errorMessage
    }

    const availability = props.wakeLock.availability()
    switch (availability) {
      case 'checking':
        return m.settings_wake_lock_checking()
      case 'supported':
        return props.wakeLock.isRequestPending()
          ? m.settings_wake_lock_requesting()
          : m.settings_wake_lock_supported()
      case 'unsupported':
        return m.settings_wake_lock_unsupported()
    }

    const exhaustiveAvailability: never = availability
    return exhaustiveAvailability
  })
  const isFullscreenDisabled = () =>
    fullscreen.availability() !== 'supported' || fullscreen.isRequestPending()
  const isWakeLockDisabled = () => props.wakeLock.availability() !== 'supported'

  return (
    <section aria-label={m.settings_section_display()} class={CLASSES.settingsSection}>
      <div class={CLASSES.settingsGrid}>
        <Show when={props.onDialogueComposerVisibleChange}>
          {(onDialogueComposerVisibleChange) => (
            <PSwitch
              checked={props.dialogueComposerVisible ?? false}
              class={CLASSES.settingsToggle}
              description={m.settings_dialogue_composer_visible_description()}
              label={m.settings_dialogue_composer_visible()}
              onChange={onDialogueComposerVisibleChange()}
            />
          )}
        </Show>
        <Show when={props.onTourButtonVisibleChange}>
          {(onChange) => (
            <PSwitch
              checked={props.tourButtonVisible ?? true}
              class={CLASSES.settingsToggle}
              description={m.settings_tour_button_visible_description()}
              label={m.settings_tour_button_visible()}
              onChange={onChange()}
            />
          )}
        </Show>
        <PSwitch
          checked={fullscreen.isEnabled()}
          class={CLASSES.settingsToggle}
          description={fullscreenDescription()}
          disabled={isFullscreenDisabled()}
          label={m.settings_fullscreen()}
          onChange={fullscreen.onEnabledChange}
        />
        <PSwitch
          checked={props.wakeLock.isEnabled()}
          class={CLASSES.settingsToggle}
          description={wakeLockDescription()}
          disabled={isWakeLockDisabled()}
          label={m.settings_wake_lock()}
          onChange={props.wakeLock.onEnabledChange}
        />
        <div class={CLASSES.settingsScreenSaver}>
          <PSelect
            label={m.settings_screen_saver()}
            onChange={(delay) => props.onScreenSaverDelayChange?.(delay)}
            options={getScreenSaverDelayOptions()}
            value={props.screenSaverDelay ?? '10m'}
          />
          <p class={`${FIELD_DESCRIPTION} m-0`}>{m.settings_screen_saver_description()}</p>
        </div>
      </div>
    </section>
  )
}
