import {createSignal, onCleanup, onMount, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  type AutomaticDialogueSettingsRepository,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../features/focus-room-dialogue'
import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../features/supertonic/model'

const CLASSES = {
  dialogueSettingsAutomatic: [
    'pomo-dialogue-settings__automatic grid gap-3.5 [border:1px_solid_rgb(214_181_133_/_24%)]',
    'settings-compact:gap-3',
    'rounded-panel bg-[rgb(214_181_133_/_4%)] p-4',
    '[&_h4]:m-0 [&_p]:m-0 [&_h4]:text-foreground [&_h4]:text-[0.8125rem]',
    '[&_h4]:font-[750] [&_>_div:first-child_>_p]:mt-[0.2rem]',
    '[&_>_div:first-child_>_p]:text-muted-foreground',
    '[&_>_div:first-child_>_p]:text-[0.65rem] [&_>_div:first-child_>_p]:leading-[1.5]',
  ].join(' '),
  dialogueSettingsAutomaticControls: [
    'pomo-dialogue-settings__automatic-controls grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3',
    'settings-compact:gap-2 automatic-dialogue-compact:grid-cols-[1fr]',
  ].join(' '),
  dialogueSettingsAutomaticLoading: [
    'pomo-dialogue-settings__automatic-loading text-muted-foreground text-[0.6875rem]',
    'leading-[1.5]',
  ].join(' '),
  dialogueSettingsAutomaticMessage: [
    'pomo-dialogue-settings__automatic-message text-muted-foreground text-[0.6875rem]',
    'leading-[1.5]',
  ].join(' '),
} as const

const MODEL_OPTIONS: ReadonlyArray<PSelectOption<SupertonicModelId>> = SUPERTONIC_MODELS.map(
  (model) => ({
    label: `${model.label} · ${model.description}`,
    value: model.id,
  }),
)
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
    import('../features/focus-room-dialogue/automatic-dialogue-settings')
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
          setMessage('자동 음성 생성 설정을 불러오지 못했어요.')
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
      setMessage('자동 음성 생성 설정이 아직 준비되지 않았어요.')
      return
    }

    try {
      currentRepository.save(nextSettings)
      setSettings(nextSettings)
      setMessage('자동 음성 생성 설정을 저장했어요.')
      window.dispatchEvent(new CustomEvent(AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT))
    } catch (error: unknown) {
      console.error('Failed to save automatic dialogue settings.', error)
      setMessage('자동 음성 생성 설정을 저장하지 못했어요.')
    }
  }

  return (
    <section
      aria-labelledby="pomo-automatic-dialogue-title"
      class={CLASSES.dialogueSettingsAutomatic}
    >
      <div>
        <h4 id="pomo-automatic-dialogue-title">자동 음성 생성</h4>
        <p>
          모든 자동 음성 생성에 사용할 모델과 음성 기본값이에요. AI 생성 음성을 타인 사칭이나 괴롭힘
          등에 악용할 수 없으며, 공개할 때는 AI 생성 음성임을 밝혀야 해요.
        </p>
      </div>
      <Show
        when={!isLoading()}
        fallback={<p class={CLASSES.dialogueSettingsAutomaticLoading}>설정 불러오는 중</p>}
      >
        <div class={CLASSES.dialogueSettingsAutomaticControls}>
          <PSelect
            accessibleLabel="자동 음성 생성 모델"
            label="음성 모델"
            onChange={(modelId) => saveSettings({...settings(), modelId})}
            options={MODEL_OPTIONS}
            value={settings().modelId}
          />
          <PSelect
            accessibleLabel="자동 음성 생성 목소리"
            label="목소리"
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
