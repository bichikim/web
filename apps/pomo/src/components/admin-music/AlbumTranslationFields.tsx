import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {useAlbumTranslation} from '../../features/album-translation/use-album-translation'
import {
  ALBUM_LOCALES,
  type AlbumDraftTranslation,
  type AlbumDraftTranslations,
  type AlbumLocale,
} from '../../features/admin-music'
import {type LanguageOption} from './language-option'
import {LanguageFields} from './LanguageFields'

const TRANSLATE_BUTTON_CLASSES = cx(
  'h-10 rounded-3 border border-#9fc8ff/45 bg-#9fc8ff/10 px-4 text-sm font-700 text-#cfe4ff',
  'transition hover:bg-#9fc8ff/18 focus-visible:outline-2 focus-visible:outline-offset-3',
  'focus-visible:outline-#9fc8ff disabled:cursor-wait disabled:opacity-45',
)

const OPTIONAL_LANGUAGE_OPTIONS: ReadonlyArray<LanguageOption> = [
  {label: 'English', locale: 'en'},
  {label: '日本語', locale: 'ja'},
  {label: '简体中文', locale: 'zh-Hans'},
] satisfies ReadonlyArray<{readonly label: string; readonly locale: (typeof ALBUM_LOCALES)[number]}>

export interface AlbumTranslationFieldsProps {
  readonly onValuesChange: (values: AlbumDraftTranslations) => void
  readonly values: AlbumDraftTranslations
}

export const AlbumTranslationFields = (props: AlbumTranslationFieldsProps) => {
  const translation = useAlbumTranslation({
    onComplete: (translatedValues) => props.onValuesChange({...props.values, ...translatedValues}),
  })

  const setField = (locale: AlbumLocale, field: keyof AlbumDraftTranslation, value: string) =>
    props.onValuesChange({
      ...props.values,
      [locale]: {...props.values[locale], [field]: value},
    })

  const handleTranslate = () => {
    const korean = props.values.ko
    translation.translate(korean)
  }

  return (
    <fieldset class="m-0 grid gap-4 border-0 p-0">
      <legend class="sr-only">언어별 앨범 제목과 설명</legend>
      <div class="rounded-4 border border-white/10 bg-white/3 p-4">
        <LanguageFields
          language={{label: '한국어 기본 정보', locale: 'ko'}}
          onFieldChange={setField}
          required
          values={props.values}
        />
      </div>
      <details class="rounded-4 border border-white/10 bg-white/2">
        <summary class="cursor-pointer px-4 py-4 text-sm font-700 text-white/75">
          다국어 제목·설명 <span class="ml-1 font-500 text-white/40">선택</span>
        </summary>
        <div class="grid gap-5 border-t border-white/8 p-4">
          <div class="grid gap-2 sm:flex sm:items-center">
            <button
              class={TRANSLATE_BUTTON_CLASSES}
              disabled={translation.isBusy() || props.values.ko.title.trim().length === 0}
              onClick={handleTranslate}
              type="button"
            >
              {translation.isBusy() ? 'Gemma 4 번역 중…' : '한국어에서 자동 번역'}
            </button>
            <span class="text-xs leading-5 text-white/45">
              영어·일본어·중국어 초안을 브라우저에서 만듭니다.
            </span>
          </div>
          <Show when={translation.state().status !== 'idle'}>
            <p class="m-0 text-xs leading-5 text-#cfe4ff">
              {(() => {
                const currentState = translation.state()

                switch (currentState.status) {
                  case 'complete':
                    return '번역 초안을 채웠습니다. 고유명사와 표현을 확인해 주세요.'
                  case 'error':
                  case 'generating':
                  case 'loading':
                    return currentState.message
                  case 'unsupported':
                    return '이 브라우저에서는 WebGPU를 사용할 수 없어 수동 입력이 필요합니다.'
                  case 'idle':
                    return ''
                }

                currentState satisfies never
              })()}
            </p>
          </Show>
          <For each={OPTIONAL_LANGUAGE_OPTIONS}>
            {(language) => (
              <div class="border-t border-white/8 pt-5 first:border-t-0 first:pt-0">
                <LanguageFields
                  language={language}
                  onFieldChange={setField}
                  values={props.values}
                />
              </div>
            )}
          </For>
        </div>
      </details>
    </fieldset>
  )
}
