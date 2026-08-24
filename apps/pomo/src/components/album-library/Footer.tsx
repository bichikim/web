import {Show} from 'solid-js'

interface PlaylistFooterProps {
  readonly canClear: boolean
  readonly clearedTrackCount: number
  readonly onClear: () => void
  readonly onRestore: () => void
  readonly trackCount: number
}

export const PlaylistFooter = (props: PlaylistFooterProps) => (
  <Show when={props.canClear && (props.trackCount > 0 || props.clearedTrackCount > 0)}>
    <Show
      fallback={
        <div class="flex min-h-11 items-center justify-between gap-4">
          <span class="text-sm text-muted-foreground">
            현재 재생목록 <strong class="font-750 text-foreground">{props.trackCount}곡</strong>
          </span>
          <button
            aria-label="재생목록 모두 비우기"
            class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
              font-700 text-muted-foreground outline-none transition-colors hover:bg-danger/10
              hover:text-danger focus-visible:shadow-focus motion-reduce:transition-none"
            onClick={() => props.onClear()}
            type="button"
          >
            비우기
          </button>
        </div>
      }
      when={props.trackCount === 0 && props.clearedTrackCount > 0}
    >
      <div
        aria-live="polite"
        class="flex min-h-11 items-center justify-between gap-4"
        role="status"
      >
        <span class="text-sm text-muted-foreground">재생목록을 비웠어요</span>
        <button
          class="min-h-11 cursor-pointer rounded-control border-0 bg-transparent px-3 text-sm
            font-750 text-highlight outline-none transition-colors hover:bg-surface
            focus-visible:shadow-focus motion-reduce:transition-none"
          onClick={() => props.onRestore()}
          type="button"
        >
          되돌리기
        </button>
      </div>
    </Show>
  </Show>
)
