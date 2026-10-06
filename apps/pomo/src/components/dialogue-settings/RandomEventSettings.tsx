import {createPreferenceSaveQueue} from 'src/features/preference-save-queue'
import {createPendingSave} from 'src/features/pending-save'
import {PNumberInput} from 'src/components/p-number-input/PNumberInput'
import {usePreference} from 'src/hooks/use-preference'
import {normalizePasteNumericInput} from 'src/utils/normalize-paste-numeric-input'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'

import {
  createRandomEventPreferenceOptions,
  DEFAULT_RANDOM_EVENT_SETTINGS,
  type RandomEventSettings as RandomEventSettingsValue,
} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'
import {DialogueEventSettingRow} from './EventSettingRow'

const CLASSES = {
  field: 'grid min-w-0 gap-1 text-sm leading-5 font-bold text-muted-foreground',
  fields: 'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2',
  interval: 'grid gap-2',
  message: 'm-0 text-sm leading-[1.5] text-muted-foreground',
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

const logPreferenceError = (isSaveError: boolean, error: unknown) => {
  console.error(
    isSaveError ? 'Failed to save random event settings.' : 'Failed to load random event settings.',
    error,
  )
}

const parseInterval = (draft: IntervalDraft): RandomEventInterval | null => {
  const maximumMinutes = Number(normalizePasteNumericInput(draft.maximum))
  const minimumMinutes = Number(normalizePasteNumericInput(draft.minimum))

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

interface RandomEventIntervalFieldsProps {
  readonly draft: Accessor<IntervalDraft>
  readonly interval: Accessor<RandomEventInterval | null>
  readonly isLoading: Accessor<boolean>
  readonly onMaximumChange: (value: string) => void
  readonly onMinimumChange: (value: string) => void
}

const RandomEventIntervalFields = (props: RandomEventIntervalFieldsProps): JSX.Element => (
  <div class={CLASSES.fields}>
    <label class={CLASSES.field}>
      <span>{m.settings_random_interval_minimum()}</span>
      <PNumberInput
        aria-label={m.settings_random_interval_minimum_label()}
        aria-invalid={props.interval() === null}
        class="w-full"
        decrementLabel={m.settings_random_interval_minimum_decrease()}
        disabled={props.isLoading()}
        incrementLabel={m.settings_random_interval_minimum_increase()}
        max={MAXIMUM_INTERVAL_MINUTES}
        min={MINIMUM_INTERVAL_MINUTES}
        onInputValueChange={props.onMinimumChange}
        onValueChange={(value) => props.onMinimumChange(String(value))}
        size="small"
        type="text"
        value={props.draft().minimum}
      />
    </label>
    <label class={CLASSES.field}>
      <span>{m.settings_random_interval_maximum()}</span>
      <PNumberInput
        aria-label={m.settings_random_interval_maximum_label()}
        aria-invalid={props.interval() === null}
        class="w-full"
        decrementLabel={m.settings_random_interval_maximum_decrease()}
        disabled={props.isLoading()}
        incrementLabel={m.settings_random_interval_maximum_increase()}
        max={MAXIMUM_INTERVAL_MINUTES}
        min={MINIMUM_INTERVAL_MINUTES}
        onInputValueChange={props.onMaximumChange}
        onValueChange={(value) => props.onMaximumChange(String(value))}
        size="small"
        type="text"
        value={props.draft().maximum}
      />
    </label>
  </div>
)

export const RandomEventSettings = () => {
  const [settings, setSettings] = createSignal<RandomEventSettingsValue>(
    DEFAULT_RANDOM_EVENT_SETTINGS,
  )
  const [draft, setDraft] = createSignal(createIntervalDraft(DEFAULT_RANDOM_EVENT_SETTINGS))
  const [message, setMessage] = createSignal<string | null>(null)
  const interval = createMemo(() => parseInterval(draft()))
  let edited = false
  let isDisposed = false
  const saveQueue = createPreferenceSaveQueue<RandomEventSettingsValue>({
    equal: (left, right) =>
      left.minimumMinutes === right.minimumMinutes &&
      left.maximumMinutes === right.maximumMinutes &&
      left.version === right.version,
    initial: DEFAULT_RANDOM_EVENT_SETTINGS,
  })

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = edited
    const settled = isSaveError ? saveQueue.settle(false) : null
    logPreferenceError(isSaveError, error)

    if (!isDisposed) {
      if (settled !== null && !settled.hasPending) {
        setSettings(settled.committed)
        setDraft(createIntervalDraft(settled.committed))
      }
      setMessage(isSaveError ? m.settings_random_save_failed() : m.settings_random_load_failed())
    }
    if (isSaveError && !saveQueue.hasPending() && !pendingSave.hasPending()) {
      edited = false
    }
  }
  const handlePreferenceSaved = () => {
    saveQueue.settle(true)
    if (!saveQueue.hasPending() && !pendingSave.hasPending()) {
      edited = false
    }
    if (!isDisposed && message() !== m.settings_random_saved()) {
      setMessage(null)
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createRandomEventPreferenceOptions({
      onError: handlePreferenceError,
      onSaved: handlePreferenceSaved,
    }),
  )
  const isLoading = () => storedSettings() === null

  createEffect(() => {
    const nextSettings = storedSettings()

    if (nextSettings === null || pendingSave.hasPending() || !saveQueue.synchronize(nextSettings)) {
      return
    }

    setSettings(nextSettings)
    setDraft(createIntervalDraft(nextSettings))
  })

  const saveSettings = (nextSettings: RandomEventSettingsValue) => {
    saveQueue.enqueue(nextSettings)
    setStoredSettings(nextSettings)

    if (!isDisposed) {
      setSettings(nextSettings)
      setMessage(m.settings_random_saved())
    }
  }

  const pendingSave = createPendingSave({
    delayMilliseconds: SAVE_DEBOUNCE_MILLISECONDS,
    save: (nextInterval: RandomEventInterval) =>
      saveSettings({...untrack(settings), ...nextInterval}),
  })

  const updateMinimum = (value: string) => {
    edited = true
    setMessage(null)
    setDraft((current) => ({...current, minimum: value}))
  }
  const updateMaximum = (value: string) => {
    edited = true
    setMessage(null)
    setDraft((current) => ({...current, maximum: value}))
  }

  onCleanup(() => {
    isDisposed = true
    pendingSave.flush()
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
      pendingSave.cancel()
      return
    }

    pendingSave.schedule(nextInterval)
  })

  return (
    <DialogueEventSettingRow
      description={m.settings_random_interval_description()}
      label={m.settings_random_interval()}
    >
      <div class={CLASSES.interval}>
        <RandomEventIntervalFields
          draft={draft}
          interval={interval}
          isLoading={isLoading}
          onMaximumChange={updateMaximum}
          onMinimumChange={updateMinimum}
        />
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
