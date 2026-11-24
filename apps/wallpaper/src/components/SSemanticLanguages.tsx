import {createMemo, createSignal, Show} from 'solid-js'
import {
  SEMANTIC_LANGUAGE_LIMIT,
  type SemanticLanguageExamples,
} from '@winter-love/wallpaper/settings/semantics'
import {semanticLanguage} from '@winter-love/wallpaper/settings/semantic-language'
import {interfaceLanguage, text as uiText} from '../features/localization'
import {SSelect} from './SSelect'

interface SSemanticLanguagesProps {
  readonly languages?: readonly SemanticLanguageExamples[]
  readonly value?: string
  readonly label?: string
  readonly onSelect?: (language: string) => void
  readonly onAdd?: (language: string) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
const LANGUAGES = [
  'en',
  'ko',
  'ja',
  'zh',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'ru',
  'ar',
  'hi',
  'vi',
  'th',
  'id',
  'tr',
]

export const SSemanticLanguages = (props: SSemanticLanguagesProps) => {
  const [custom, setCustom] = createSignal(false)
  const [code, setCode] = createSignal('')
  const caption = () => props.label ?? uiText('예문')
  const names = createMemo(
    () => new Intl.DisplayNames([interfaceLanguage.language()], {type: 'language'}),
  )
  const name = (language: string) =>
    language === 'und' ? uiText('언어 미지정') : (names().of(language) ?? language)
  const languages = () => props.languages ?? []
  const options = createMemo(() =>
    languages().map((example) => ({label: name(example.language), value: example.language})),
  )
  const available = createMemo(() => [
    ...LANGUAGES.filter(
      (language) => !languages().some((example) => example.language === language),
    ).map((language) => ({label: name(language), value: language})),
    {label: uiText('다른 언어…'), value: 'custom'},
  ])
  const full = () => languages().length >= SEMANTIC_LANGUAGE_LIMIT
  const validCode = createMemo(() => {
    const language = semanticLanguage(code())
    return language !== undefined && !languages().some((example) => example.language === language)
      ? language
      : null
  })
  const handleAdd = (language: string) => {
    if (language === 'custom') {
      setCustom(true)
      return
    }
    return props.onAdd?.(language)
  }
  const handleCode = (event: InputEvent & {currentTarget: HTMLInputElement}) =>
    setCode(event.currentTarget.value)
  const handleCancel = () => {
    setCustom(false)
    setCode('')
  }
  const handleRemove = () => props.onRemove?.()
  const handleCustom = () => {
    const language = validCode()
    if (language !== null) {
      const saved = props.onAdd?.(language)
      handleCancel()
      return saved
    }
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleCustom()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
    }
  }
  return (
    <div class="grid min-w-0 gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <Show
          when={languages().length > 0}
          fallback={
            <span class="min-w-0 flex-1 text-xs text-stone-500">
              {uiText('언어를 추가해 주세요.')}
            </span>
          }
        >
          <div class="min-w-0 flex-1">
            <SSelect
              label={uiText('{value0} 예문 언어', {value0: caption()})}
              options={options()}
              value={props.value}
              disabled={props.onSelect === undefined}
              onChange={props.onSelect}
            />
          </div>
        </Show>
        <Show when={props.onAdd}>
          <div class="shrink-0">
            <SSelect
              appearance="breadcrumb"
              label={uiText('{value0} 언어 추가', {value0: caption()})}
              placeholder={uiText('언어 추가')}
              value=""
              options={available()}
              disabled={full()}
              onChange={handleAdd}
            />
          </div>
        </Show>
        <Show when={props.value && props.onRemove}>
          <button
            type="button"
            aria-label={uiText('{value0} 언어 삭제', {value0: name(props.value!)})}
            title={uiText('이 언어 삭제')}
            onClick={handleRemove}
            class="wallpaper-file-button grid h-8 w-8 shrink-0 place-items-center p-0 text-stone-500 hover:text-red-700"
          >
            ×
          </button>
        </Show>
      </div>
      <Show when={custom()}>
        <div class="flex min-w-0 items-center gap-2">
          <input
            type="text"
            aria-label={uiText('언어 코드')}
            placeholder="fr-CA"
            value={code()}
            maxLength={35}
            autofocus
            onInput={handleCode}
            onKeyDown={handleKeyboard}
            aria-invalid={code().trim() !== '' && validCode() === null}
            class="wallpaper-field min-w-0 flex-1 aria-[invalid=true]:border-red-600"
          />
          <button
            type="button"
            disabled={validCode() === null || full() || props.onAdd === undefined}
            onClick={handleCustom}
            class="wallpaper-file-button shrink-0 disabled:opacity-40"
          >
            {uiText('추가')}
          </button>
          <button
            type="button"
            aria-label={uiText('언어 추가 취소')}
            onClick={handleCancel}
            class="wallpaper-file-button shrink-0"
          >
            {uiText('취소')}
          </button>
        </div>
      </Show>
    </div>
  )
}
