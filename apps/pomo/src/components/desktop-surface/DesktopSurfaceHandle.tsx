import {cx} from 'class-variance-authority'

interface DesktopSurfaceHandleProps {
  readonly class?: string
  readonly title: string
}

const handleDesktopSurfacePointerDown = (event: PointerEvent) => {
  if (import.meta.env.VITE_POMO_IS_DESKTOP !== 'true' || event.button !== 0) {
    return
  }

  import('@tauri-apps/api/window')
    .then(({getCurrentWindow}) => getCurrentWindow().startDragging())
    .catch((error: unknown) => {
      console.error('Failed to start moving the desktop surface.', error)
    })
}

export const DesktopSurfaceHandle = (props: DesktopSurfaceHandleProps) => (
  <button
    aria-label={`${props.title} 이동 손잡이`}
    class={cx(
      'flex h-5 w-12 flex-none cursor-move self-center touch-none select-none items-center justify-center ',
      'rounded-full border border-solid border-border bg-surface text-muted-foreground ',
      'outline-none transition-[background-color_140ms_ease,color_140ms_ease] ',
      'hover:bg-surface-interactive hover:text-foreground focus-visible:shadow-focus ',
      'motion-reduce:transition-none',
      props.class,
    )}
    data-tauri-drag-region
    onPointerDown={handleDesktopSurfacePointerDown}
    title={`${props.title} 이동`}
    type="button"
  >
    <span aria-hidden="true" class="i-tabler-grip-horizontal size-4" />
  </button>
)
