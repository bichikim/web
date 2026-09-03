import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  RANDOM_EVENT_SETTINGS_CHANGED_EVENT,
  type RandomEventSettings as RandomEventSettingsValue,
  readRandomEventSettings,
  writeRandomEventSettings,
} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'
import {DialogueEventSettingRow} from './EventSettingRow'

const CLASSES = {
  field: 'grid min-w-0 gap-1 text-[0.625rem] font-bold text-muted-foreground',
  fields: 'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2',
  input: cx(
    'h-9 min-w-0 w-full box-border rounded-control border border-solid border-border',
    'bg-surface px-3 text-xs font-bold tabular-nums text-foreground outline-none',
    'focus:border-highlight disabled:cursor-not-allowed disabled:opacity-45',
  ),
  interval: 'grid gap-2',
  message: 'm-0 text-[0.625rem] leading-[1.5] text-muted-foreground',
} as const

interface IntervalDraft {
  readonly maximum: string
  readonly minimum: string
}

interface RandomEventInterval {
  readonly maximumMinutes: number
  readonly minimumMinutes: number
}

const MAXIMUM_INTERVAL_MINUTES = 120
const MINIMUM_INTERVAL_MINUTES = 1
const SAVE_DEBOUNCE_MILLISECONDS = 500

const createIntervalDraft = (settings: RandomEventSettingsValue): IntervalDraft => ({
  maximum: String(settings.maximumMinutes),
  minimum: String(settings.minimumMinutes),
})

const parseInterval = (draft: IntervalDraft): RandomEventInterval | null => {
  const maximumMinutes = Number(draft.maximum)
  const minimumMinutes = Number(draft.minimum)

  if (
    !Number.isInteger(maximumMinutes) ||
    !Number.isInteger(minimumMinutes) ||
    minimumMinutes < MINIMUM_INTERVAL_MINUTES ||
    maximumMinutes > MAXIMUM_INTERVAL_MINUTES ||
    minimumMinutes > maximumMinutes
  ) {
    return null
  }

  return {maximumMinutes, minimumMinutes}
}

export const RandomEventSettings = () => {
  const [settings, setSettings] = createSignal<RandomEventSettingsValue>(
    DEFAULT_RANDOM_EVENT_SETTINGS,
  )
  const [draft, setDraft] = createSignal(createIntervalDraft(DEFAULT_RANDOM_EVENT_SETTINGS))
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  const interval = createMemo(() => parseInterval(draft()))
  let isDisposed = false
  let pendingInterval: RandomEventInterval | null = null

  onMount(() => {
    readRandomEventSettings()
      .then((storedSettings) => {
        if (!isDisposed) {
          setSettings(storedSettings)
          setDraft(createIntervalDraft(storedSettings))
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load random event settings.', error)

        if (!isDisposed) {
          setMessage(m.settings_random_load_failed())
        }
      })
      .finally(() => {
        if (!isDisposed) {
          setIsLoading(false)
        }
      })

    onCleanup(() => {
      isDisposed = true
    })
  })

  const saveSettings = async (nextSettings: RandomEventSettingsValue): Promise<void> => {
    try {
      await writeRandomEventSettings(nextSettings)
      window.dispatchEvent(
        new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {detail: nextSettings}),
      )

      if (!isDisposed) {
        setSettings(nextSettings)
        setMessage(m.settings_random_saved())
      }
    } catch (error: unknown) {
      console.error('Failed to save random event settings.', error)

      if (!isDisposed) {
        setMessage(m.settings_random_save_failed())
      }
    }
  }

  onCleanup(() => {
    isDisposed = true
    const nextInterval = pendingInterval
    pendingInterval = null

    if (nextInterval !== null) {
      saveSettings({...untrack(settings), ...nextInterval})
    }
  })

  createEffect(() => {
    const nextInterval = interval()
    const currentSettings = settings()

    if (
      isLoading() ||
      nextInterval === null ||
      (nextInterval.minimumMinutes === currentSettings.minimumMinutes &&
        nextInterval.maximumMinutes === currentSettings.maximumMinutes)
    ) {
      pendingInterval = null
      return
    }

    pendingInterval = nextInterval
    const timeoutId = window.setTimeout(() => {
      pendingInterval = null
      saveSettings({...untrack(settings), ...nextInterval})
    }, SAVE_DEBOUNCE_MILLISECONDS)

    onCleanup(() => window.clearTimeout(timeoutId))
  })

  return (
    <DialogueEventSettingRow
      description={m.settings_random_interval_description()}
      label={m.settings_random_interval()}
    >
      <div class={CLASSES.interval}>
        <div class={CLASSES.fields}>
          <label class={CLASSES.field}>
            <span>{m.settings_random_interval_minimum()}</span>
            <input
              aria-label={m.settings_random_interval_minimum_label()}
              aria-invalid={interval() === null}
              class={CLASSES.input}
              disabled={isLoading()}
              max={MAXIMUM_INTERVAL_MINUTES}
              min={MINIMUM_INTERVAL_MINUTES}
              onInput={(event) => {
                setMessage(null)
                setDraft((current) => ({...current, minimum: event.currentTarget.value}))
              }}
              type="number"
              value={draft().minimum}
            />
          </label>
          <label class={CLASSES.field}>
            <span>{m.settings_random_interval_maximum()}</span>
            <input
              aria-label={m.settings_random_interval_maximum_label()}
              aria-invalid={interval() === null}
              class={CLASSES.input}
              disabled={isLoading()}
              max={MAXIMUM_INTERVAL_MINUTES}
              min={MINIMUM_INTERVAL_MINUTES}
              onInput={(event) => {
                setMessage(null)
                setDraft((current) => ({...current, maximum: event.currentTarget.value}))
              }}
              type="number"
              value={draft().maximum}
            />
          </label>
        </div>
        <Show
          fallback={
            <Show when={message()}>
              {(currentMessage) => (
                <p aria-live="polite" class={CLASSES.message} role="status">
                  {currentMessage()}
                </p>
              )}
            </Show>
          }
          when={interval() === null}
        >
          <p aria-live="polite" class={CLASSES.message} role="status">
            {m.settings_random_interval_invalid()}
          </p>
        </Show>
      </div>
    </DialogueEventSettingRow>
  )
}
