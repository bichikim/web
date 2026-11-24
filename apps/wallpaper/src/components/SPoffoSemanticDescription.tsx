import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'
import {
  SEMANTIC_DESCRIPTION_LIMIT,
  type SemanticBinding,
} from '@winter-love/wallpaper/settings/semantics'

import {Show} from 'solid-js'
import {useSemanticExamples} from '../features/semantics/use-semantic-examples'
import {SSemanticLanguages} from './SSemanticLanguages'

interface SPoffoSemanticDescriptionProps {
  readonly value: SemanticBinding
  readonly label: string
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
}
export const SPoffoSemanticDescription = (props: SPoffoSemanticDescriptionProps) => {
  const editor = useSemanticExamples({
    onChange: (value) => props.onChange?.(value),
    preferred: interfaceLanguage.language,
    value: () => props.value,
  })
  const handleText = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) =>
    editor.edit({text: event.currentTarget.value})
  const handleExclusions = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) =>
    editor.edit({excludeText: event.currentTarget.value || undefined})
  return (
    <div class="grid min-w-0 gap-2">
      <SSemanticLanguages
        label={props.label}
        languages={editor.values()}
        value={editor.current()?.language}
        onSelect={editor.select}
        onAdd={props.onChange === undefined ? undefined : editor.add}
        onRemove={props.onChange === undefined ? undefined : editor.remove}
      />
      <Show when={editor.current() !== null}>
        <textarea
          aria-label={uiText('{value0} 감정·행동·내용', {value0: String(props.label)})}
          placeholder={uiText('예: 정리해서 작성했어요.\n문서에 기록해 두었어요.')}
          value={editor.current()?.text ?? ''}
          maxLength={SEMANTIC_DESCRIPTION_LIMIT}
          rows={2}
          onInput={handleText}
          disabled={props.onChange === undefined}
          class="box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
        px-2 py-1.5 font-inherit text-inherit"
        />
        <details class="wallpaper-disclosure-panel border-0 bg-transparent text-xs text-stone-600">
          <summary
            class="wallpaper-disclosure min-h-8 px-2 text-xs font-normal"
            title={uiText('이 예문이 더 가까우면 연결하지 않아요.')}
          >
            {uiText('제외 예문')}
          </summary>
          <div class="wallpaper-disclosure-content p-2">
            <textarea
              aria-label={uiText('{value0} 제외 예문', {value0: String(props.label)})}
              placeholder={uiText('예: 슬프지만 울지는 않았어요.')}
              value={editor.current()?.excludeText ?? ''}
              maxLength={SEMANTIC_DESCRIPTION_LIMIT}
              rows={2}
              onInput={handleExclusions}
              disabled={props.onChange === undefined}
              class="box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1.5 font-inherit text-inherit"
            />
          </div>
        </details>
      </Show>
      <Show when={editor.error()}>
        {(message) => (
          <div role="alert" class="flex items-center justify-between gap-2 text-xs text-red-700">
            <span>{localizeMessage(message())}</span>
            <button type="button" onClick={editor.retry} class="wallpaper-file-button">
              {uiText('다시 시도')}
            </button>
          </div>
        )}
      </Show>
    </div>
  )
}
