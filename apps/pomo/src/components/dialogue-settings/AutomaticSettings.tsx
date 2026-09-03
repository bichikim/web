import {cx} from 'class-variance-authority'
import {createSignal, onCleanup, onMount, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../PSelect'
import {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  type AutomaticDialogueSettingsRepository,
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
    'pomo-dialogue-settings__automatic grid gap-3.5 [border:0.0625rem_solid_rgb(214_181_133_/_24%)]',
    'settings-compact:gap-3',
    'rounded-panel bg-[rgb(214_181_133_/_4%)] p-4',
    '[&_h4]:m-0 [&_p]:m-0 [&_h4]:text-foreground [&_h4]:text-[0.8125rem]',
    '[&_h4]:font-[750] [&_>_div:first-child_>_p]:mt-[0.2rem]',
    '[&_>_div:first-child_>_p]:text-muted-foreground',
    '[&_>_div:first-child_>_p]:text-[0.65rem] [&_>_div:first-child_>_p]:leading-[1.5]',
  ),
  dialogueSettingsAutomaticControls: cx(
    'pomo-dialogue-settings__automatic-controls grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3',
    'settings-compact:gap-2 automatic-dialogue-compact:grid-cols-[1fr]',
  ),
  dialogueSettingsAutomaticLoading: cx(
    'pomo-dialogue-settings__automatic-loading text-muted-foreground text-[0.6875rem]',
    'leading-[1.5]',
  ),
  dialogueSettingsAutomaticMessage: cx(
    'pomo-dialogue-settings__automatic-message text-muted-foreground text-[0.6875rem]',
    'leading-[1.5]',
  ),
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

export const AutomaticDialogueSettings = () => {
  const [settings, setSettings] = createSignal(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let repository: AutomaticDialogueSettingsRepository | null = null

  onMount(() => {
    let disposed = false
    import('../../features/focus-room-dialogue/automatic-dialogue-settings')
      .then(({createAutomaticDialogueSettingsRepository}) => {
        const nextRepository = createAutomaticDialogueSettingsRepository(window.localStorage)

        if (!disposed) {
          repository = nextRepository
          setSettings(nextRepository.load())
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load automatic dialogue settings.', error)
        if (!disposed) {
          setMessage(m.settings_dialogue_automatic_load_failed())
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false)
        }
      })

    onCleanup(() => {
      disposed = true
    })
  })

  const saveSettings = (nextSettings: typeof DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS) => {
    const currentRepository = repository

    if (currentRepository === null) {
      setMessage(m.settings_dialogue_automatic_not_ready())
      return
    }

    try {
      currentRepository.save(nextSettings)
      setSettings(nextSettings)
      setMessage(m.settings_dialogue_automatic_saved())
      window.dispatchEvent(new CustomEvent(AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT))
    } catch (error: unknown) {
      console.error('Failed to save automatic dialogue settings.', error)
      setMessage(m.settings_dialogue_automatic_save_failed())
    }
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
