import * as m from '@paraglide/message'
import {useHorizontalScroll} from '@winter-love/solid-use/horizontal-scroll'
import {cx} from 'class-variance-authority'
import {createSignal, For, type JSX, Show} from 'solid-js'

export interface PHorizontalScrollProps {
  readonly accessibleLabel?: string
  readonly buttonClass?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly edgeClass?: string
  readonly leftLabel?: string
  readonly pageRatio?: number
  readonly rightLabel?: string
  readonly viewportClass?: string
}

export const PHorizontalScroll = (props: PHorizontalScrollProps) => {
  const [viewport, setViewport] = createSignal<HTMLDivElement | null>(null)
  const scroll = useHorizontalScroll({pageRatio: () => props.pageRatio, viewport})

  return (
    <div class={cx('relative min-w-0', props.class)}>
      <div
        aria-label={props.accessibleLabel ?? m.horizontal_scroll_label()}
        class={cx(
          'relative min-w-0 overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto',
          'focus-visible:outline-2 focus-visible:outline-solid',
          props.viewportClass ?? 'focus-visible:outline-highlight',
        )}
        onScroll={scroll.onScroll}
        ref={setViewport}
        role="region"
        tabIndex={0}
      >
        {props.children}
      </div>
      <For each={[-1, 1] as const}>
        {(direction) => (
          <Show when={direction === -1 ? scroll.canScrollLeft() : scroll.canScrollRight()}>
            <div
              class={cx(
                'pointer-events-none absolute w-12 flex items-center',
                direction === -1
                  ? 'left-0 justify-start bg-gradient-to-r'
                  : 'right-0 justify-end bg-gradient-to-l',
                props.edgeClass ?? 'inset-y-0 from-surface-strong to-transparent',
              )}
            >
              <button
                aria-label={
                  direction === -1
                    ? (props.leftLabel ?? m.horizontal_scroll_left())
                    : (props.rightLabel ?? m.horizontal_scroll_right())
                }
                class={cx(
                  'pointer-events-auto size-10 flex cursor-pointer items-center justify-center',
                  'border border-solid rounded-full shadow-[0_3px_12px_#0006]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid',
                  props.buttonClass ??
                    'border-border bg-surface-strong text-foreground hover:bg-secondary-soft ' +
                      'focus-visible:outline-highlight',
                )}
                onClick={direction === -1 ? scroll.scrollLeft : scroll.scrollRight}
                type="button"
              >
                <span
                  aria-hidden="true"
                  class={cx(
                    'size-6',
                    direction === -1 ? 'i-tabler-chevron-left' : 'i-tabler-chevron-right',
                  )}
                />
              </button>
            </div>
          </Show>
        )}
      </For>
    </div>
  )
}
