import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
import {SIcon} from './SIcon'

interface SFileNavigationProps {
  canBack?: boolean
  canForward?: boolean
  busy?: boolean
  hasDocument?: boolean
  onMove?: (direction: -1 | 1) => void
  onRefresh?: () => void
}

export const SFileNavigation = (props: SFileNavigationProps) => {
  const t = useTranslations()
  return (
    <nav
      aria-label={t('파일 탐색')}
      class="flex h-[var(--toolbar-control-height,33px)] shrink-0 items-center gap-1 rounded-pill
      border border-divider bg-canvas px-1 shadow-toolbar"
    >
      <STooltip content={t('뒤로 이동')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('뒤로 이동')}
            class="ui-navigation-button disabled:text-muted disabled:opacity-30"
            disabled={!props.canBack || props.busy}
            onClick={() => props.onMove?.(-1)}
            type="button"
          >
            <SIcon name="arrowLeft" />
          </button>
        )}
      </STooltip>
      <STooltip content={t('앞으로 이동')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('앞으로 이동')}
            class="ui-navigation-button disabled:text-muted disabled:opacity-30"
            disabled={!props.canForward || props.busy}
            onClick={() => props.onMove?.(1)}
            type="button"
          >
            <SIcon name="arrowRight" />
          </button>
        )}
      </STooltip>
      <span aria-hidden="true" class="mx-1 h-4 w-px shrink-0 bg-divider" />
      <STooltip content={t('새로고침')}>
        {(description) => (
          <button
            aria-describedby={description}
            aria-label={t('새로고침')}
            class="ui-navigation-button"
            disabled={!props.hasDocument || props.busy}
            onClick={() => props.onRefresh?.()}
            type="button"
          >
            <SIcon name="refresh" />
          </button>
        )}
      </STooltip>
    </nav>
  )
}
