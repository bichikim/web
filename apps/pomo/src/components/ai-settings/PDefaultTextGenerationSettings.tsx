import {createEffect, createSignal, Show} from 'solid-js'
import {cx} from 'class-variance-authority'
import {usePreference} from 'src/hooks/use-preference'
import {createPreferenceSaveQueue} from 'src/features/preference-save-queue'
import {
  createTextGenerationPreferenceOptions,
  DEFAULT_TEXT_GENERATION_SETTINGS,
  DEFAULT_TEXT_MODEL_IDS,
  type DefaultTextModelId,
  type TextGenerationSettings,
} from 'src/features/text-generation/settings'
import {getTextModel} from 'src/features/text-generation'
import {PSelect, type PSelectOption} from '../p-select/PSelect'
import * as m from '@paraglide/message'
import {useAuth} from 'src/features/auth'
import {useCloudTextUsage} from 'src/features/cloud-text/use-cloud-text-usage'

const CLASSES = {
  textSettings: cx(
    'grid gap-3.5 [border:0.0625rem_solid_rgb(214_181_133_/_24%)]',
    'settings-compact:gap-3',
    'rounded-panel bg-[rgb(214_181_133_/_4%)] p-4',
    '[&_h4]:m-0 [&_p]:m-0 [&_h4]:text-foreground [&_h4]:text-base [&_h4]:leading-6',
    '[&_h4]:font-[750] [&_>_div:first-child_>_p]:mt-[0.2rem]',
    '[&_>_div:first-child_>_p]:text-muted-foreground',
    '[&_>_div:first-child_>_p]:text-sm [&_>_div:first-child_>_p]:leading-[1.5]',
  ),
  textSettingsLoading: cx('text-muted-foreground text-sm leading-[1.5]'),
  textSettingsMessage: cx('text-muted-foreground text-sm leading-[1.5]'),
} as const

const MODEL_OPTIONS: ReadonlyArray<PSelectOption<DefaultTextModelId>> = DEFAULT_TEXT_MODEL_IDS.map(
  (id) => {
    const model = getTextModel(id)
    return {label: `${model.label} · ${model.downloadSize}`, value: id}
  },
)

export const PDefaultTextGenerationSettings = () => {
  const authentication = useAuth()
  const cloud = useCloudTextUsage()
  const cloudOption = (): PSelectOption<DefaultTextModelId> => {
    if (authentication.session() === null) {
      return {disabled: true, label: m.settings_ai_cloud_login(), value: 'cloud'}
    }
    const usage = cloud.usage()
    const label =
      usage === null
        ? cloud.error()
          ? m.settings_ai_cloud_usage_failed()
          : m.settings_ai_cloud_usage_loading()
        : usage.remaining === null
          ? m.settings_ai_cloud_unlimited()
          : m.settings_ai_cloud_usage({remaining: usage.remaining})
    return {label, value: 'cloud'}
  }
  const modelOptions = (): ReadonlyArray<PSelectOption<DefaultTextModelId>> =>
    MODEL_OPTIONS.map((option) => (option.value === 'cloud' ? cloudOption() : option))
  const [failedSettings, setFailedSettings] = createSignal<TextGenerationSettings | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)
  const saveQueue = createPreferenceSaveQueue({
    equal: (left, right) => left.modelId === right.modelId && left.version === right.version,
    initial: DEFAULT_TEXT_GENERATION_SETTINGS,
  })

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = saveQueue.hasPending()
    console.error(
      isSaveError
        ? 'Failed to save text generation settings.'
        : 'Failed to load text generation settings.',
      error,
    )

    if (isSaveError) {
      const settled = saveQueue.settle(false)
      if (settled.value !== null && !settled.hasPending) {
        setFailedSettings(settled.committed)
      }
    }
    setMessage(isSaveError ? m.settings_ai_text_save_failed() : m.settings_ai_text_load_failed())
  }
  const handlePreferenceSaved = () => {
    const settled = saveQueue.settle(true)
    if (settled.value !== null) {
      if (!settled.hasPending) {
        setFailedSettings(null)
      }
      setMessage(null)
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createTextGenerationPreferenceOptions({
      onError: handlePreferenceError,
      onSaved: handlePreferenceSaved,
    }),
  )

  const settings = () => failedSettings() ?? storedSettings() ?? DEFAULT_TEXT_GENERATION_SETTINGS
  const isLoading = () => storedSettings() === null

  createEffect(() => {
    const currentSettings = storedSettings()

    if (currentSettings === null || saveQueue.hasPending()) {
      return
    }

    if (saveQueue.synchronize(currentSettings)) {
      setFailedSettings(null)
    }
  })

  const saveSettings = (nextSettings: TextGenerationSettings) => {
    if (nextSettings.modelId === 'cloud' && authentication.session() === null) {
      return
    }
    if (storedSettings() === null) {
      setMessage(m.settings_ai_text_not_ready())
      return
    }

    saveQueue.clearFailure()
    setFailedSettings(null)
    saveQueue.enqueue(nextSettings)
    setStoredSettings(nextSettings, {rollbackOnError: true})
  }

  return (
    <section aria-labelledby="pomo-default-text-title" class={CLASSES.textSettings}>
      <div>
        <h4 id="pomo-default-text-title">{m.settings_ai_text_title()}</h4>
        <p>{m.settings_ai_text_description()}</p>
      </div>
      <Show
        when={!isLoading()}
        fallback={<p class={CLASSES.textSettingsLoading}>{m.settings_ai_text_loading()}</p>}
      >
        <div class="grid min-w-0 gap-3">
          <PSelect
            accessibleLabel={m.settings_ai_text_model_label()}
            label={m.settings_ai_text_model()}
            onChange={(modelId) => saveSettings({...settings(), modelId})}
            options={modelOptions()}
            value={settings().modelId}
          />
        </div>
      </Show>
      <Show when={message()}>
        {(currentMessage) => (
          <p aria-live="polite" class={CLASSES.textSettingsMessage} role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </section>
  )
}
