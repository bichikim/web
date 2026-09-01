import {cx} from 'class-variance-authority'
import {createSignal, onCleanup, onMount, Show} from 'solid-js'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
  readDialogueVolumeDuckingSettings,
  writeDialogueVolumeDuckingSettings,
} from '../../features/focus-room-dialogue'
import {PSwitch} from '../PSwitch'
import {PSettingsSectionHeading} from '../settings/SectionHeading'

const CLASSES = {
  field: cx(
    'grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-x-4 gap-y-2',
    'border-t border-solid border-border pt-3',
  ),
  message: 'm-0 text-[0.625rem] leading-[1.5] text-muted-foreground',
  panel: cx(
    'pomo-dialogue-settings__volume-ducking grid gap-3 rounded-panel',
    '[border:1px_solid_rgb(255_255_255_/_6%)] bg-[rgb(255_255_255_/_3%)] p-4',
  ),
  range: cx(
    'col-span-2 h-5 w-full cursor-pointer accent-primary disabled:cursor-not-allowed',
    'disabled:opacity-45',
  ),
  value: 'text-xs font-bold tabular-nums text-foreground',
} as const

const MINIMUM_PLAYER_VOLUME_PERCENT = 0
const MAXIMUM_PLAYER_VOLUME_PERCENT = 100
const SAVE_DEBOUNCE_MILLISECONDS = 300

const dispatchSettingsChange = (settings: DialogueVolumeDuckingSettingsValue) => {
  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {detail: settings}),
  )
}

export const DialogueVolumeDuckingSettings = () => {
  const [settings, setSettings] = createSignal<DialogueVolumeDuckingSettingsValue>(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let disposed = false
  let pendingSettings: DialogueVolumeDuckingSettingsValue | null = null
  let saveTimeout: number | null = null

  const persistSettings = async (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    try {
      await writeDialogueVolumeDuckingSettings(nextSettings)
      if (!disposed) {
        setMessage('플레이어 음량 설정을 저장했어요.')
      }
    } catch (error: unknown) {
      console.error('Failed to save dialogue volume ducking settings.', error)
      if (!disposed) {
        setMessage('플레이어 음량 설정을 저장하지 못했어요.')
      }
    }
  }

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    setSettings(nextSettings)
    setMessage(null)
    dispatchSettingsChange(nextSettings)
    pendingSettings = nextSettings

    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout)
    }

    saveTimeout = window.setTimeout(() => {
      saveTimeout = null
      pendingSettings = null
      persistSettings(nextSettings)
    }, SAVE_DEBOUNCE_MILLISECONDS)
  }

  onMount(() => {
    readDialogueVolumeDuckingSettings()
      .then((storedSettings) => {
        if (!disposed) {
          setSettings(storedSettings)
          dispatchSettingsChange(storedSettings)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load dialogue volume ducking settings.', error)
        if (!disposed) {
          setMessage('플레이어 음량 설정을 불러오지 못했어요.')
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false)
        }
      })
  })

  onCleanup(() => {
    disposed = true

    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout)
    }

    const nextSettings = pendingSettings
    pendingSettings = null
    if (nextSettings !== null) {
      writeDialogueVolumeDuckingSettings(nextSettings).catch((error: unknown) => {
        console.error('Failed to save dialogue volume ducking settings.', error)
      })
    }
  })

  return (
    <section aria-labelledby="pomo-dialogue-volume-title" class="grid gap-3">
      <PSettingsSectionHeading
        divider="none"
        title="대화 옵션"
        titleId="pomo-dialogue-volume-title"
      />
      <div class={CLASSES.panel}>
        <PSwitch
          checked={settings().enabled}
          description="대화 중 음악을 설정한 비율로 낮추고, 끝나면 원래 음량으로 돌아가요."
          disabled={isLoading()}
          label="대화 중 플레이어 음량 낮춤"
          onChange={(enabled) => scheduleSave({...settings(), enabled})}
        />
        <label class={CLASSES.field}>
          <span class="text-[0.6875rem] font-bold text-muted-foreground">대화 중 음악 음량</span>
          <output class={CLASSES.value} for="pomo-dialogue-player-volume">
            {settings().playerVolumePercent}%
          </output>
          <input
            aria-label="대화 중 플레이어 음량 비율"
            class={CLASSES.range}
            disabled={isLoading() || !settings().enabled}
            id="pomo-dialogue-player-volume"
            max={MAXIMUM_PLAYER_VOLUME_PERCENT}
            min={MINIMUM_PLAYER_VOLUME_PERCENT}
            onInput={(event) =>
              scheduleSave({
                ...settings(),
                playerVolumePercent: event.currentTarget.valueAsNumber,
              })
            }
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
