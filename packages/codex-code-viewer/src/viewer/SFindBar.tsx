import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
import {createEffect, createSignal} from 'solid-js'
import {SIcon} from './SIcon'

interface SFindBarProps {
  query?: string
  count?: number
  active?: number
  focusRequest?: number
  onChange?: (query: string) => void
  onMove?: (direction: -1 | 1) => void
  onClose?: () => void
}

export const SFindBar = (props: SFindBarProps) => {
  const t = useTranslations()
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  createEffect(() => {
    props.focusRequest
    const field = input()
    field?.focus()
    field?.select()
  })
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    if (event.key === 'Enter' && event.target === input()) {
      event.preventDefault()
      props.onMove?.(event.shiftKey ? -1 : 1)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      props.onClose?.()
    }
  }
  return (
    <section
      aria-label={t('파일 내 검색')}
      class="flex shrink-0 items-center gap-1 border-b border-divider px-4 pb-2"
      onKeyDown={handleKeyboard}
    >
      <label class="ui-field h-8 flex-1">
        <SIcon name="search" />
        <input
          aria-label={t('파일 내 검색어')}
          class="min-w-0 w-full border-0 bg-transparent font-sans text-sm text-foreground outline-none
            placeholder:text-muted"
          onInput={(event) => props.onChange?.(event.currentTarget.value)}
          placeholder={t('현재 파일에서 찾기…')}
          ref={setInput}
          type="text"
          value={props.query ?? ''}
        />
      </label>
      <span
        aria-atomic="true"
        aria-live="polite"
        class="min-w-12 text-center text-xs text-muted"
        role="status"
      >
        {props.query === ''
          ? '0/0'
          : (props.count ?? 0) === 0
            ? t('결과 없음')
            : `${(props.active ?? -1) + 1}/${props.count}`}
      </span>
      <STooltip content={t('이전 결과 (Shift+Enter)')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('이전 검색 결과')}
            class="ui-icon-button"
            disabled={!props.count}
            onClick={() => props.onMove?.(-1)}
            type="button"
          >
            <SIcon name="back" />
          </button>
        )}
      </STooltip>
      <STooltip content={t('다음 결과 (Enter)')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('다음 검색 결과')}
            class="ui-icon-button"
            disabled={!props.count}
            onClick={() => props.onMove?.(1)}
            type="button"
          >
            <SIcon name="forward" />
          </button>
        )}
      </STooltip>
      <STooltip content={t('닫기 (Escape)')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('파일 내 검색 닫기')}
            class="ui-icon-button"
            onClick={() => props.onClose?.()}
            type="button"
          >
            <SIcon name="close" />
          </button>
        )}
      </STooltip>
    </section>
  )
}
