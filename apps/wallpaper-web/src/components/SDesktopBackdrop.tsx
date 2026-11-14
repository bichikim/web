import {clientOnly} from '@solidjs/start'
import {createMemo, createSignal, Show} from 'solid-js'
import {useBackgroundSource} from '../features/animated-background/use-background-source'
import {WIDGET_BACKGROUNDS, type WidgetBackground} from '../features/widget-preview'

const SAnimatedBackdrop = clientOnly(() => import('./SAnimatedBackdrop'), {lazy: true})

interface SDesktopBackdropProps {
  readonly background?: WidgetBackground
  /** Suspend hidden background animations while keeping their prepared scene. */
  readonly playing?: boolean
}

export const SDesktopBackdrop = (props: SDesktopBackdropProps) => {
  const [host, setHost] = createSignal<HTMLDivElement | null>(null)
  const background = createMemo(
    () =>
      WIDGET_BACKGROUNDS.find((item) => item.id === (props.background ?? 'profile')) ??
      WIDGET_BACKGROUNDS[0],
  )
  const source = useBackgroundSource({
    host,
    landscape: () => background().model,
    portrait: () => background().portraitModel,
    tall: () => background().tallModel,
  })
  return (
    <div
      ref={setHost}
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Show when={source()} keyed>
        {(model) => (
          <SAnimatedBackdrop
            model={model}
            label={`움직이는 ${background().name} 배경`}
            playing={props.playing}
          />
        )}
      </Show>
    </div>
  )
}
