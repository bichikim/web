import {createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  RANDOM_EVENT_SETTINGS_CHANGED_EVENT,
  type RandomEventSettings as RandomEventSettingsValue,
  readRandomEventSettings,
  writeRandomEventSettings,
} from '../features/focus-room-dialogue'
import {DialogueEventSettingRow} from './DialogueEventSettingRow'

const CLASSES = {
  field: 'grid min-w-0 gap-1 text-[0.625rem] font-bold text-muted-foreground',
  fields: 'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-2',
  input: [
    'h-9 min-w-0 w-full box-border rounded-control border border-solid border-border',
    'bg-surface px-3 text-xs font-bold tabular-nums text-foreground outline-none',
    'focus:border-highlight disabled:cursor-not-allowed disabled:opacity-45',
  ].join(' '),
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
const INVALID_INTERVAL_MESSAGE =
  '간격은 1~120분 사이의 정수여야 하고, 최소 간격은 최대 간격보다 클 수 없어요.'

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
          setMessage('랜덤 이벤트 설정을 불러오지 못했어요.')
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

  const saveSettings = async (nextSettings: RandomEventSettingsValue) => {
    try {
      await writeRandomEventSettings(nextSettings)
      window.dispatchEvent(
        new CustomEvent(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, {detail: nextSettings}),
      )

      if (!isDisposed) {
        setSettings(nextSettings)
        setMessage('랜덤 이벤트 설정을 저장했어요.')
      }
    } catch (error: unknown) {
      console.error('Failed to save random event settings.', error)

      if (!isDisposed) {
        setMessage('랜덤 이벤트 설정을 저장하지 못했어요.')
      }
    }
  }

  onCleanup(() => {
    isDisposed = true
    const nextInterval = pendingInterval
    pendingInterval = null

    if (nextInterval !== null) {
      saveSettings({...untrack(settings), ...nextInterval}).catch((error: unknown) => {
        console.error('Unexpected random event interval flush failure.', error)
      })
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
      saveSettings({...untrack(settings), ...nextInterval}).catch((error: unknown) => {
        console.error('Unexpected random event interval update failure.', error)
      })
    }, SAVE_DEBOUNCE_MILLISECONDS)

    onCleanup(() => window.clearTimeout(timeoutId))
  })

  return (
    <DialogueEventSettingRow
      description="포모와 시작한 뒤 이 범위에서 다음 발생 시간을 계속 새로 정해요."
      label="발생 간격"
    >
      <div class={CLASSES.interval}>
        <div class={CLASSES.fields}>
          <label class={CLASSES.field}>
            <span>최소(분)</span>
            <input
              aria-label="랜덤 이벤트 최소 간격(분)"
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
            <span>최대(분)</span>
            <input
              aria-label="랜덤 이벤트 최대 간격(분)"
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
            {INVALID_INTERVAL_MESSAGE}
          </p>
        </Show>
      </div>
    </DialogueEventSettingRow>
  )
}
