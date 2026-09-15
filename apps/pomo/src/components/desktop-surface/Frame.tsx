import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {createSignal, type JSXElement, Show} from 'solid-js'

import {useDesktopSurfaceSize} from '../../features/desktop-mode'
import {DesktopSurfaceHandle} from './DesktopSurfaceHandle'

const DESKTOP_SURFACE_SHADOW_RESET = '[&_*:not(:focus-visible)]:shadow-none'

interface DesktopSurfaceFrameProps {
  readonly accessibleLabel: string
  readonly children: JSXElement
  readonly class?: string
  readonly contentClass?: string
  readonly isVisible: boolean
  readonly title: string
}

export const DesktopSurfaceFrame = (props: DesktopSurfaceFrameProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  useDesktopSurfaceSize({element})

  return (
    <main
      class={cx(
        'pomo-desktop-surface box-border h-fit w-fit overflow-hidden bg-transparent text-foreground',
        DESKTOP_SURFACE_SHADOW_RESET,
      )}
    >
      <Title>{props.title}</Title>
      <Show when={props.isVisible}>
        <section
          aria-label={props.accessibleLabel}
          class={cx('box-border flex h-fit flex-col items-center gap-2 p-3', props.class)}
          ref={setElement}
        >
          <DesktopSurfaceHandle title={props.title} />
          <div class={cx('h-fit', props.contentClass ?? 'w-fit')}>{props.children}</div>
        </section>
      </Show>
    </main>
  )
}
