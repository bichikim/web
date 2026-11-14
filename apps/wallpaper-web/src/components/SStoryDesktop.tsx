import {createMemo, Show} from 'solid-js'
import type {StoryFrame} from '../features/desktop-story/frame'
import type {StoryTransition} from '../features/desktop-story/types'
import {SDesktopPreview} from './SDesktopPreview'
import {SStoryMask} from './SStoryMask'

interface SStoryDesktopProps {
  /** Incoming or settled chapter that determines the desktop content. */
  readonly frame: StoryFrame
  /** Outgoing chapter during a diagonal transition; omitted has no outgoing desktop. */
  readonly previousFrame?: StoryFrame | null
  /** Diagonal boundary shared with the chapter content; omitted leaves the desktop unmasked. */
  readonly transition?: StoryTransition | null
}

const hasDesktop = (frame: StoryFrame | null | undefined) =>
  Boolean(frame?.visible && (frame.kind === 'overview' || frame.kind === 'wallpaper'))

/** Retain one desktop and its GPU context while chapter masks enter and leave. */
export const SStoryDesktop = (props: SStoryDesktopProps) => {
  const incoming = createMemo(() => hasDesktop(props.frame))
  const outgoing = createMemo(() =>
    Boolean(props.transition && !incoming() && hasDesktop(props.previousFrame)),
  )
  const visible = createMemo(() => incoming() || outgoing())
  const frame = createMemo(() => (outgoing() ? props.previousFrame! : props.frame))
  const retained = createMemo<StoryFrame | null>(
    (previous) => (visible() ? frame() : (previous ?? null)),
    null,
  )
  return (
    <SStoryMask
      hidden={!visible()}
      outgoing={outgoing()}
      transition={visible() ? props.transition : null}
    >
      <Show when={retained()}>
        {(current) => (
          <SDesktopPreview
            live={current().kind === 'wallpaper'}
            playing={visible() && !current().transitioning}
          />
        )}
      </Show>
    </SStoryMask>
  )
}
