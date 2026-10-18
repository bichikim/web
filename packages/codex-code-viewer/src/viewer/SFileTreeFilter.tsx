import {useTranslations} from './locale/use-translations'
import {SIcon} from './SIcon'

interface SFileTreeFilterProps {
  readonly query?: string
  readonly onChange?: (query: string) => void
}
export const SFileTreeFilter = (props: SFileTreeFilterProps) => {
  const t = useTranslations()
  return (
    <label class="ui-field mx-2 mb-2 gap-2 rounded-control px-2 text-muted">
      <SIcon name="search" />
      <input
        aria-label={t('파일 필터링')}
        class="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        onInput={(event) => props.onChange?.(event.currentTarget.value)}
        placeholder={t('파일 필터링…')}
        value={props.query ?? ''}
      />
    </label>
  )
}
