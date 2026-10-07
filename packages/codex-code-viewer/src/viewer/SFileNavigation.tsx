import {SIcon} from './SIcon'

interface SFileNavigationProps {
  canBack?: boolean
  canForward?: boolean
  busy?: boolean
  hasDocument?: boolean
  onMove?: (direction: -1 | 1) => void
  onRefresh?: () => void
}

export const SFileNavigation = (props: SFileNavigationProps) => (
  <nav
    aria-label="파일 탐색"
    class="flex h-[var(--toolbar-control-height,33px)] shrink-0 items-center gap-1 rounded-pill
      border border-divider bg-canvas px-1 shadow-toolbar"
  >
    <button
      aria-label="뒤로 이동"
      class="ui-navigation-button disabled:text-muted disabled:opacity-30"
      disabled={!props.canBack || props.busy}
      onClick={() => props.onMove?.(-1)}
      type="button"
      title="뒤로 이동"
    >
      <SIcon name="arrowLeft" />
    </button>
    <button
      aria-label="앞으로 이동"
      class="ui-navigation-button disabled:text-muted disabled:opacity-30"
      disabled={!props.canForward || props.busy}
      onClick={() => props.onMove?.(1)}
      type="button"
      title="앞으로 이동"
    >
      <SIcon name="arrowRight" />
    </button>
    <span aria-hidden="true" class="mx-1 h-4 w-px shrink-0 bg-divider" />
    <button
      aria-label="새로고침"
      class="ui-navigation-button"
      disabled={!props.hasDocument || props.busy}
      onClick={() => props.onRefresh?.()}
      type="button"
      title="새로고침"
    >
      <SIcon name="refresh" />
    </button>
  </nav>
)
