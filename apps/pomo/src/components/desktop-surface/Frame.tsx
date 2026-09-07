import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {type JSXElement, Show} from 'solid-js'

interface DesktopSurfaceFrameProps {
  readonly accessibleLabel: string
  readonly children: JSXElement
  readonly class?: string
  readonly isVisible: boolean
  readonly title: string
}

export const DesktopSurfaceFrame = (props: DesktopSurfaceFrameProps) => {
  return (
    <main class="pomo-desktop-surface box-border min-h-dvh w-full overflow-hidden bg-transparent text-foreground">
      <Title>{props.title}</Title>
      <Show when={props.isVisible}>
        <section
          aria-label={props.accessibleLabel}
          class={cx('box-border min-h-dvh w-full p-3', props.class)}
          data-tauri-drag-region="deep"
        >
          {props.children}
        </section>
      </Show>
    </main>
  )
}
