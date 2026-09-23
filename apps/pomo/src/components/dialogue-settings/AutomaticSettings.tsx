import {cx} from 'class-variance-authority'
import {usePreference} from 'src/hooks/use-preference'
import {createEffect, createSignal, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../p-select/PSelect'
import {
  type AutomaticDialogueSettings as AutomaticDialogueSettingsValue,
  createAutomaticDialoguePreferenceOptions,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../../features/focus-room-dialogue'
import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic/model'
import * as m from '@paraglide/message'

const CLASSES = {
  dialogueSettingsAutomatic: cx(
    'grid gap-3.5 [border:0.0625rem_solid_rgb(214_181_133_/_24%)]',
    'settings-compact:gap-3',
    'rounded-panel bg-[rgb(214_181_133_/_4%)] p-4',
    '[&_h4]:m-0 [&_p]:m-0 [&_h4]:text-foreground [&_h4]:text-base [&_h4]:leading-6',
    '[&_h4]:font-[750] [&_>_div:first-child_>_p]:mt-[0.2rem]',
    '[&_>_div:first-child_>_p]:text-muted-foreground',
    '[&_>_div:first-child_>_p]:text-sm [&_>_div:first-child_>_p]:leading-[1.5]',
  ),
  dialogueSettingsAutomaticControls: cx(
    'grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3',
    'settings-compact:gap-2 automatic-dialogue-compact:grid-cols-[1fr]',
  ),
  dialogueSettingsAutomaticLoading: cx('text-muted-foreground text-sm leading-[1.5]'),
  dialogueSettingsAutomaticMessage: cx('text-muted-foreground text-sm leading-[1.5]'),
} as const

const getModelOptions = (): ReadonlyArray<PSelectOption<SupertonicModelId>> =>
  SUPERTONIC_MODELS.map((model) => ({
    label: `${model.label} · ${
      model.id === 'full'
        ? m.settings_dialogue_model_full_description()
        : m.settings_dialogue_model_int8_description()
    }`,
    value: model.id,
  }))
const VOICE_OPTIONS: ReadonlyArray<PSelectOption<SupertonicVoiceId>> = SUPERTONIC_VOICES.map(
  (voice) => ({label: voice.label, value: voice.id}),
)

const areAutomaticDialogueSettingsEqual = (
  left: AutomaticDialogueSettingsValue,
  right: AutomaticDialogueSettingsValue,
) =>
  left.modelId === right.modelId && left.version === right.version && left.voiceId === right.voiceId

export const AutomaticDialogueSettings = () => {
  const [failedSettings, setFailedSettings] = createSignal<AutomaticDialogueSettingsValue | null>(
    null,
  )
  const [message, setMessage] = createSignal<string | null>(null)
  const pendingSaves: Array<AutomaticDialogueSettingsValue> = []
  let committedSettings = DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS
  let failedStoredSettings: AutomaticDialogueSettingsValue | null = null

  const settleSave = (didSave: boolean): AutomaticDialogueSettingsValue | null => {
    const settledSettings = pendingSaves.shift() ?? null
    if (didSave && settledSettings !== null) {
      committedSettings = settledSettings
    }
    return settledSettings
  }

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = pendingSaves.length > 0
    console.error(
      isSaveError
        ? 'Failed to save automatic dialogue settings.'
        : 'Failed to load automatic dialogue settings.',
      error,
    )

    if (isSaveError) {
      const settledSettings = settleSave(false)
      if (settledSettings !== null && pendingSaves.length === 0) {
        setFailedSettings(committedSettings)
      }
    }
    setMessage(
      isSaveError
        ? m.settings_dialogue_automatic_save_failed()
        : m.settings_dialogue_automatic_load_failed(),
    )
  }
  const handlePreferenceSaved = () => {
    const settledSettings = settleSave(true)
    if (settledSettings !== null) {
      if (pendingSaves.length === 0) {
        failedStoredSettings = null
        setFailedSettings(null)
      }
      setMessage(m.settings_dialogue_automatic_saved())
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createAutomaticDialoguePreferenceOptions({
      onError: handlePreferenceError,
      onSaved: handlePreferenceSaved,
    }),
  )

  const settings = () => failedSettings() ?? storedSettings() ?? DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS
  const isLoading = () => storedSettings() === null

  createEffect(() => {
    const currentSettings = storedSettings()

    if (currentSettings === null || pendingSaves.length > 0) {
      return
    }

    if (failedStoredSettings !== null) {
      if (areAutomaticDialogueSettingsEqual(currentSettings, failedStoredSettings)) {
        return
      }
      failedStoredSettings = null
      setFailedSettings(null)
    }

    committedSettings = currentSettings
  })

  const saveSettings = (nextSettings: AutomaticDialogueSettingsValue) => {
    if (storedSettings() === null) {
      setMessage(m.settings_dialogue_automatic_not_ready())
      return
    }

    failedStoredSettings = null
    setFailedSettings(null)
    pendingSaves.push(nextSettings)
    failedStoredSettings = nextSettings
    setStoredSettings(nextSettings)
  }

  return (
    <section
      aria-labelledby="pomo-automatic-dialogue-title"
      class={CLASSES.dialogueSettingsAutomatic}
    >
      <div>
        <h4 id="pomo-automatic-dialogue-title">{m.settings_dialogue_automatic_title()}</h4>
        <p>{m.settings_dialogue_automatic_description()}</p>
      </div>
      <Show
        when={!isLoading()}
        fallback={
          <p class={CLASSES.dialogueSettingsAutomaticLoading}>
            {m.settings_dialogue_automatic_loading()}
          </p>
        }
      >
        <div class={CLASSES.dialogueSettingsAutomaticControls}>
          <PSelect
            accessibleLabel={m.settings_dialogue_automatic_model_label()}
            label={m.settings_dialogue_automatic_model()}
            onChange={(modelId) => saveSettings({...settings(), modelId})}
            options={getModelOptions()}
            value={settings().modelId}
          />
          <PSelect
            accessibleLabel={m.settings_dialogue_automatic_voice_label()}
            label={m.settings_dialogue_automatic_voice()}
            onChange={(voiceId) => saveSettings({...settings(), voiceId})}
            options={VOICE_OPTIONS}
            value={settings().voiceId}
          />
        </div>
      </Show>
      <Show when={message()}>
        {(currentMessage) => (
          <p aria-live="polite" class={CLASSES.dialogueSettingsAutomaticMessage} role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </section>
  )
}
