import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {type JSXElement, onCleanup, onMount, Show} from 'solid-js'

interface DesktopSurfaceFrameProps {
  readonly accessibleLabel: string
  readonly children: JSXElement
  readonly class?: string
  readonly isVisible: boolean
  readonly title: string
}

interface BackgroundProperty {
  readonly priority: string
  readonly value: string
}

const useTransparentDocumentBackground = () => {
  onMount(() => {
    const elements = [document.documentElement, document.body]
    const previous = elements.map(
      (element): BackgroundProperty => ({
        priority: element.style.getPropertyPriority('background'),
        value: element.style.getPropertyValue('background'),
      }),
    )

    for (const element of elements) {
      element.style.setProperty('background', 'transparent', 'important')
    }

    onCleanup(() => {
      for (const [index, element] of elements.entries()) {
        const property = previous[index]
        if (property?.value) {
          element.style.setProperty('background', property.value, property.priority)
        } else {
          element.style.removeProperty('background')
        }
      }
    })
  })
}

export const DesktopSurfaceFrame = (props: DesktopSurfaceFrameProps) => {
  useTransparentDocumentBackground()

  return (
    <main class="box-border min-h-dvh w-full overflow-hidden bg-transparent text-foreground">
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
