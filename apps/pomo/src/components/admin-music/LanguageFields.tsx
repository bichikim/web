import {PInput} from 'src/components/PInput'
import {PTextarea} from 'src/components/PTextarea'
import {cx} from 'class-variance-authority'
import {
  type AlbumDraftTranslation,
  type AlbumDraftTranslations,
  type AlbumLocale,
} from '../../features/admin-music'
import {type LanguageOption} from './language-option'

const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
)

const TEXTAREA_CLASSES = cx(
  'min-h-24 w-full resize-y rounded-3 border border-white/15 bg-white/5 p-3 text-sm',
  'text-white outline-none focus:border-#e8bc88/70',
)

interface LanguageFieldsProps {
  readonly language: LanguageOption
  readonly onFieldChange: (
    locale: AlbumLocale,
    field: keyof AlbumDraftTranslation,
    value: string,
  ) => void
  readonly required?: boolean
  readonly values: AlbumDraftTranslations
}

export const LanguageFields = (props: LanguageFieldsProps) => (
  <section class="grid gap-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="m-0 text-sm font-750">{props.language.label}</h3>
      <span class="text-xs text-white/45">{props.required ? '필수' : '선택'}</span>
    </div>
    <label class="grid gap-2 text-sm">
      앨범명
      <PInput
        unstyled
        class={FIELD_CLASSES}
        maxlength="120"
        name={`title.${props.language.locale}`}
        onInput={(event) =>
          props.onFieldChange(props.language.locale, 'title', event.currentTarget.value)
        }
        required={props.required}
        value={props.values[props.language.locale].title}
      />
    </label>
    <label class="grid gap-2 text-sm">
      설명
      <PTextarea
        unstyled
        class={TEXTAREA_CLASSES}
        maxlength="2000"
        name={`description.${props.language.locale}`}
        onInput={(event) =>
          props.onFieldChange(props.language.locale, 'description', event.currentTarget.value)
        }
        required={props.required}
        value={props.values[props.language.locale].description}
      />
    </label>
  </section>
)
