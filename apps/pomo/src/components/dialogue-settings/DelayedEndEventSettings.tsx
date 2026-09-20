import {createPendingSave} from 'src/features/pending-save'
import {PButton} from 'src/components/p-button/PButton'
import {PNumberInput} from 'src/components/p-number-input/PNumberInput'
import {createEffect, createSignal, onCleanup, Show} from 'solid-js'

import {
  MAX_DELAYED_END_EVENT_MINUTES,
  MIN_DELAYED_END_EVENT_MINUTES,
  usePEvents,
} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'
import {DialogueEventSettingRow} from './EventSettingRow'

const CONTROL_GROUP_CLASS = 'flex flex-wrap items-end gap-2'
const INPUT_LABEL_CLASS = 'grid min-w-0 gap-1 text-sm leading-5 font-bold text-muted-foreground'
const MESSAGE_CLASS = 'm-0 text-sm leading-[1.5] text-muted-foreground'
const SAVE_DEBOUNCE_MILLISECONDS = 500

const parseDuration = (value: string) => {
  const durationMinutes = Number(value)
  return Number.isInteger(durationMinutes) &&
    durationMinutes >= MIN_DELAYED_END_EVENT_MINUTES &&
    durationMinutes <= MAX_DELAYED_END_EVENT_MINUTES
    ? durationMinutes
    : null
}

export const DelayedEndEventSettings = () => {
  const events = usePEvents()
  const getDuration = () => events.delayedEndEventDurationMinutes()
  const [draft, setDraft] = createSignal(String(getDuration()))
  const [message, setMessage] = createSignal<string | null>(null)
  let hasEdited = false
  let editRevision = 0
  let isDisposed = false
  const duration = () => parseDuration(draft())
  const isRunning = () => events.delayedEndEventIsRunning()

  createEffect(() => {
    if (!hasEdited && !events.isLoading()) {
      setDraft(String(getDuration()))
    }
  })

  const saveDuration = (value: string, revision: number) => {
    const nextDuration = parseDuration(value)
    if (nextDuration === null) {
      return
    }

    events.setDelayedEndEventDuration(nextDuration).catch((error: unknown) => {
      console.error('Failed to save delayed end event settings.', error)
      if (!isDisposed && revision === editRevision) {
        hasEdited = false
        setDraft(String(getDuration()))
        setMessage(m.settings_delayed_end_save_failed())
      }
    })
  }
  const pendingSave = createPendingSave({
    delayMilliseconds: SAVE_DEBOUNCE_MILLISECONDS,
    save: (snapshot: {readonly value: string; readonly revision: number}) =>
      saveDuration(snapshot.value, snapshot.revision),
  })
  onCleanup(() => {
    isDisposed = true
    pendingSave.flush()
  })

  const handleStartOrCancel = () => {
    setMessage(null)
    if (isRunning()) {
      events.cancelDelayedEndEvent()
      return
    }

    if (duration() !== null) {
      pendingSave.flush()
      events.startDelayedEndEvent()
    }
  }
  const updateDuration = (value: string) => {
    hasEdited = true
    const revision = (editRevision += 1)
    setMessage(null)
    setDraft(value)
    pendingSave.schedule({revision, value})
  }

  return (
    <DialogueEventSettingRow
      description={m.settings_delayed_end_delay_description()}
      label={m.settings_delayed_end_delay()}
    >
      <div class="grid gap-2">
        <div class={CONTROL_GROUP_CLASS}>
          <label class={INPUT_LABEL_CLASS}>
            <span>{m.settings_delayed_end_delay_input_label()}</span>
            <PNumberInput
              aria-invalid={duration() === null}
              aria-label={m.settings_delayed_end_delay_label()}
              class="w-32"
              decrementLabel={m.settings_delayed_end_decrease()}
              disabled={events.isLoading()}
              incrementLabel={m.settings_delayed_end_increase()}
              max={MAX_DELAYED_END_EVENT_MINUTES}
              min={MIN_DELAYED_END_EVENT_MINUTES}
              onInputValueChange={updateDuration}
              onValueChange={(value) => updateDuration(String(value))}
              step={1}
              unit="분"
              value={draft()}
            />
          </label>
          <PButton
            class="shrink-0"
            disabled={events.isLoading() || (!isRunning() && duration() === null)}
            icon={isRunning() ? 'i-tabler-player-stop' : 'i-tabler-player-play'}
            onPress={handleStartOrCancel}
            pressed={isRunning()}
            size="small"
            tone={isRunning() ? 'danger' : 'primary'}
          >
            {isRunning() ? m.settings_delayed_end_cancel() : m.settings_delayed_end_start()}
          </PButton>
        </div>
        <Show
          fallback={
            <Show when={message()}>
              {(currentMessage) => (
                <p aria-live="polite" class={MESSAGE_CLASS} role="status">
                  {currentMessage()}
                </p>
              )}
            </Show>
          }
          when={duration() === null}
        >
          <p aria-live="polite" class={MESSAGE_CLASS} role="status">
            {m.settings_delayed_end_invalid()}
          </p>
        </Show>
      </div>
    </DialogueEventSettingRow>
  )
}
