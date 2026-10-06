import {createEffect, createSignal, For, onCleanup, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {PButton} from 'src/components/p-button/PButton'
import {DEFAULT_RELAX_BACKGROUND_SOURCE, RELAX_BACKGROUND_OPTIONS} from './background-options'

const SCROLL_RATIO = 0.8

export interface PRelaxBackgroundListProps {
  readonly onSelect?: (source: string) => void
  readonly selectedSource?: string
}

export const PRelaxBackgroundList = (props: PRelaxBackgroundListProps) => {
  const [backgroundList, setBackgroundList] = createSignal<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = createSignal(false)
  const [canScrollRight, setCanScrollRight] = createSignal(false)

  const updateScrollEdges = (element: HTMLDivElement) => {
    setCanScrollLeft(element.scrollLeft > 1)
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1)
  }
  const scrollBackgrounds = (direction: -1 | 1) => {
    const element = backgroundList()
    element?.scrollBy({left: direction * element.clientWidth * SCROLL_RATIO})
  }

  createEffect(() => {
    const element = backgroundList()
    if (element === null) {
      return
    }
    updateScrollEdges(element)
    const observer = new ResizeObserver(() => updateScrollEdges(element))
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })

  return (
    <div class="relative min-w-0">
      <div
        aria-label={m.relax_background_title()}
        class="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain
      scroll-px-1 scroll-smooth p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      motion-reduce:scroll-auto"
        onScroll={(event) => updateScrollEdges(event.currentTarget)}
        ref={setBackgroundList}
        role="radiogroup"
      >
        <For each={RELAX_BACKGROUND_OPTIONS}>
          {(background) => (
            <label class="relative w-[70%] shrink-0 snap-start cursor-pointer sm:w-[55%]">
              <input
                checked={
                  (props.selectedSource ?? DEFAULT_RELAX_BACKGROUND_SOURCE) === background.source
                }
                class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                name="relax-background"
                onChange={() => props.onSelect?.(background.source)}
                type="radio"
                value={background.source}
              />
              <span
                class="block overflow-hidden rounded-panel border border-solid border-border
              bg-surface-strong text-foreground transition-colors
              peer-checked:border-highlight peer-focus-visible:shadow-focus"
              >
                <img alt="" class="aspect-video w-full object-cover" src={background.source} />
                <span class="flex items-center justify-between gap-2 px-3 py-2 text-sm font-650">
                  <span>{background.label()}</span>
                  <Show
                    when={
                      (props.selectedSource ?? DEFAULT_RELAX_BACKGROUND_SOURCE) ===
                      background.source
                    }
                  >
                    <span aria-hidden="true" class="i-tabler-check size-4" />
                  </Show>
                </span>
              </span>
            </label>
          )}
        </For>
      </div>
      <div
        class="pointer-events-none absolute left-1 top-1/2 h-16 w-16 flex -translate-y-1/2
          items-center rounded-full bg-gradient-to-r from-surface-strong/45 to-transparent pl-1"
      >
        <PButton
          accessibleLabel={m.relax_background_previous()}
          backdropBlur
          class="pointer-events-auto min-h-11 min-w-11"
          disabled={!canScrollLeft()}
          icon="i-tabler-chevron-left"
          onPress={() => scrollBackgrounds(-1)}
          pill
          size="small"
          tone="glass"
          transparent
        />
      </div>
      <div
        class="pointer-events-none absolute right-1 top-1/2 h-16 w-16 flex -translate-y-1/2
          items-center justify-end rounded-full bg-gradient-to-l from-surface-strong/45 to-transparent pr-1"
      >
        <PButton
          accessibleLabel={m.relax_background_next()}
          backdropBlur
          class="pointer-events-auto min-h-11 min-w-11"
          disabled={!canScrollRight()}
          icon="i-tabler-chevron-right"
          onPress={() => scrollBackgrounds(1)}
          pill
          size="small"
          tone="glass"
          transparent
        />
      </div>
    </div>
  )
}
