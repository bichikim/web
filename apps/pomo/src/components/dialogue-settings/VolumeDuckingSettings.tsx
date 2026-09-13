import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {PSwitch} from '../p-switch/PSwitch'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {useVolumeDucking} from './use-volume-ducking'

const CLASSES = {
  field: cx(
    'grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-x-4 gap-y-2',
    'border-t border-solid border-border pt-3',
  ),
  message: 'm-0 text-modal-detail leading-[1.5] text-muted-foreground',
  panel: cx(
    'pomo-dialogue-settings__volume-ducking grid gap-3 rounded-panel',
    'border border-solid border-content-border bg-content-surface p-4',
  ),
  range: cx(
    'col-span-2 h-5 w-full cursor-pointer accent-primary disabled:cursor-not-allowed',
    'disabled:opacity-45',
  ),
  value: 'text-modal-detail font-bold tabular-nums text-foreground',
} as const

const MINIMUM_PLAYER_VOLUME_PERCENT = 0
const MAXIMUM_PLAYER_VOLUME_PERCENT = 100
export const DialogueVolumeDuckingSettings = () => {
  const {settings, isLoading, message, changeEnabled, changeVolume} = useVolumeDucking()
  const handleVolumeInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    changeVolume(event.currentTarget.valueAsNumber)

  return (
    <section aria-labelledby="pomo-dialogue-volume-title" class="grid gap-3">
      <PSettingsSectionHeading
        divider="none"
        title={m.settings_dialogue_options()}
        titleId="pomo-dialogue-volume-title"
      />
      <div class={CLASSES.panel}>
        <PSwitch
          checked={settings().enabled}
          description={m.settings_dialogue_ducking_description()}
          disabled={isLoading()}
          label={m.settings_dialogue_ducking()}
          onChange={changeEnabled}
        />
        <label class={CLASSES.field}>
          <span class="text-modal-detail font-bold text-muted-foreground">
            {m.settings_dialogue_music_volume()}
          </span>
          <output class={CLASSES.value} for="pomo-dialogue-player-volume">
            {settings().playerVolumePercent}%
          </output>
          <input
            aria-label={m.settings_dialogue_music_volume_label()}
            class={CLASSES.range}
            disabled={isLoading() || !settings().enabled}
            id="pomo-dialogue-player-volume"
            max={MAXIMUM_PLAYER_VOLUME_PERCENT}
            min={MINIMUM_PLAYER_VOLUME_PERCENT}
            onInput={handleVolumeInput}
            step="1"
            type="range"
            value={settings().playerVolumePercent}
          />
        </label>
        <Show when={message()}>
          {(currentMessage) => (
            <p aria-live="polite" class={CLASSES.message} role="status">
              {currentMessage()}
            </p>
          )}
        </Show>
      </div>
    </section>
  )
}
