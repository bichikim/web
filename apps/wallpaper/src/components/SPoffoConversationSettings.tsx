import {localizeMessage, text as uiText} from '../features/localization'

import {createEffect, createMemo, Show, untrack} from 'solid-js'
import {
  DEFAULT_POFFO_CONVERSATION,
  type PoffoConversation,
} from '@winter-love/wallpaper/settings/conversation'
import {codexConversation} from '../features/conversation/codex'
import {useCodexModels} from '../features/conversation/use-codex-models'
import {resolveConversationModel} from '../features/conversation/resolve-conversation-model'
import {SSelect} from './SSelect'

interface SPoffoConversationSettingsProps {
  readonly value?: PoffoConversation
  readonly onChange?: (value: PoffoConversation) => void | Promise<void>
}
export const SPoffoConversationSettings = (props: SPoffoConversationSettingsProps) => {
  const value = () => props.value ?? DEFAULT_POFFO_CONVERSATION
  const models = useCodexModels(() => props.onChange !== undefined && codexConversation.available())
  const selection = () =>
    value().provider === 'local' ? 'local' : `codex:${value().codexModel ?? ''}`
  const options = createMemo(() => [
    {
      get label() {
        return uiText('Gemma 4 E2B · 로컬')
      },
      value: 'local',
    },
    ...(models.models() ?? []).map((model) => ({
      label: `Codex · ${model.name}`,
      value: `codex:${model.id}`,
    })),
  ])
  createEffect(() => {
    const catalog = models.models()
    const current = value()
    if (catalog === null || models.loading() || models.error() !== null) {
      return
    }
    const next = resolveConversationModel(current, catalog)
    if (next !== current) {
      untrack(() => props.onChange?.(next))
    }
  })
  const change = (selected: string) => {
    if (selected === 'local') {
      return props.onChange?.({...value(), provider: 'local'})
    }
    return props.onChange?.({codexModel: selected.slice('codex:'.length), provider: 'codex'})
  }
  return (
    <section aria-label={uiText('대화 모델 설정')} class="grid gap-3 text-[13px]">
      <h3 class="m-0 font-semibold text-stone-800">{uiText('캐릭터와 대화')}</h3>
      <SSelect
        label={uiText('대화 모델')}
        options={options()}
        value={selection()}
        placeholder={models.loading() ? uiText('모델 불러오는 중…') : uiText('Codex 모델 선택')}
        disabled={props.onChange === undefined}
        onChange={change}
        onOpen={models.retry}
      />
      <Show when={models.error()}>
        {(error) => (
          <div class="flex items-center gap-2">
            <p role="alert" class="m-0 min-w-0 flex-1 text-xs text-red-700">
              {localizeMessage(error() ?? '')}
            </p>
            <button type="button" class="wallpaper-file-button" onClick={models.retry}>
              {uiText('다시 불러오기')}
            </button>
          </div>
        )}
      </Show>
    </section>
  )
}
