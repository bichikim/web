import * as m from '@paraglide/message'

interface PreviewButtonProps {
  readonly isLimited: boolean
  readonly isPending: boolean
  readonly isPlaying: boolean
  readonly onPress: () => void
  readonly title: string
}

export const PreviewButton = (props: PreviewButtonProps) => (
  <button
    aria-label={`${props.title} ${
      props.isLimited
        ? props.isPlaying
          ? m.album_preview_limited_stop()
          : m.album_preview_limited()
        : props.isPlaying
          ? m.album_preview_stop()
          : m.album_preview()
    }`}
    aria-pressed={props.isPlaying}
    class="grid size-8 flex-none cursor-pointer place-items-center rounded-control border
      border-solid border-border bg-transparent text-highlight outline-none transition-colors
      hover:border-border-hover hover:bg-surface focus-visible:shadow-focus
      motion-reduce:transition-none"
    onClick={() => props.onPress()}
    type="button"
  >
    <span
      aria-hidden="true"
      class={
        props.isPending
          ? 'i-tabler-loader-2 size-4 animate-spin motion-reduce:animate-none'
          : props.isPlaying
            ? 'i-tabler-player-stop size-4'
            : 'i-tabler-player-play size-4'
      }
    />
  </button>
)
