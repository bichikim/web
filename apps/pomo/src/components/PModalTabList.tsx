import {Tabs} from '@kobalte/core/tabs'
import {cx} from 'class-variance-authority'
import {createEffect, createSignal, For, type JSX, onCleanup, Show} from 'solid-js'

const TAB_LIST_CLASSES =
  'flex h-full w-full min-w-0 flex-1 overflow-x-auto overscroll-x-contain ' +
  '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [touch-action:pan-x] ' +
  '[&::-webkit-scrollbar]:hidden'

const TAB_SCROLL_BUTTON_CLASSES =
  'absolute inset-y-0 flex w-6 cursor-pointer items-center border-0 p-0 ' +
  'text-muted-foreground outline-none transition-colors hover:text-foreground ' +
  'focus-visible:text-highlight motion-reduce:transition-none'

const TAB_CLASSES =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 ' +
  'whitespace-nowrap border-0 rounded-0 bg-transparent px-4 ' +
  'text-[0.8125rem] font-700 text-muted-foreground ' +
  'shadow-[inset_0_-0.1875rem_0_transparent] outline-none ' +
  'transition-[background-color_140ms_ease,box-shadow_140ms_ease,color_140ms_ease] ' +
  'hover:bg-secondary-soft hover:text-foreground ' +
  'ui-selected:bg-transparent ui-selected:text-foreground ui-selected:shadow-tab-active ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-highlight ' +
  'motion-reduce:transition-none'

const TAB_SCROLL_RATIO = 0.7

export interface PModalTabItem {
  readonly icon: string
  readonly label: string
  readonly value: string
}

export interface PModalTabScrollControls {
  readonly nextLabel: string
  readonly previousLabel: string
}

export interface PModalTabListProps {
  readonly accessibleLabel: string
  readonly class?: string
  readonly items: ReadonlyArray<PModalTabItem>
  readonly scrollControls?: PModalTabScrollControls
}

export const PModalTabList = (props: PModalTabListProps) => {
  const [canScrollLeft, setCanScrollLeft] = createSignal(false)
  const [canScrollRight, setCanScrollRight] = createSignal(false)
  const [listElement, setListElement] = createSignal<HTMLDivElement>()
  const updateScrollHints = (element: HTMLDivElement) => {
    const edgeTolerance = 1

    setCanScrollLeft(element.scrollLeft > edgeTolerance)
    setCanScrollRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - edgeTolerance,
    )
  }
  const handleScroll: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    updateScrollHints(event.currentTarget)
  }
  const scrollTabs = (direction: -1 | 1) => {
    const element = listElement()

    if (element === undefined) {
      return
    }

    element.scrollBy({
      behavior: 'smooth',
      left: direction * element.clientWidth * TAB_SCROLL_RATIO,
    })
  }

  createEffect(() => {
    if (props.scrollControls === undefined) {
      return
    }

    const element = listElement()

    if (element === undefined) {
      return
    }

    updateScrollHints(element)

    const resizeObserver = new ResizeObserver(() => updateScrollHints(element))
    resizeObserver.observe(element)
    onCleanup(() => resizeObserver.disconnect())
  })

  return (
    <div class="relative h-full min-w-0">
      <Tabs.List
        aria-label={props.accessibleLabel}
        class={cx(TAB_LIST_CLASSES, props.class)}
        onScroll={handleScroll}
        ref={setListElement}
      >
        <For each={props.items}>
          {(item) => (
            <Tabs.Trigger class={TAB_CLASSES} value={item.value}>
              <span aria-hidden="true" class={cx(item.icon, 'size-4')} />
              <span>{item.label}</span>
            </Tabs.Trigger>
          )}
        </For>
      </Tabs.List>
      <Show when={props.scrollControls !== undefined && canScrollLeft()}>
        <button
          aria-label={props.scrollControls?.previousLabel}
          class={
            `${TAB_SCROLL_BUTTON_CLASSES} left-0 justify-start ` +
            'bg-gradient-to-r from-surface-strong to-transparent'
          }
          onClick={() => scrollTabs(-1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
        </button>
      </Show>
      <Show when={props.scrollControls !== undefined && canScrollRight()}>
        <button
          aria-label={props.scrollControls?.nextLabel}
          class={
            `${TAB_SCROLL_BUTTON_CLASSES} right-0 justify-end ` +
            'bg-gradient-to-r from-transparent to-surface-strong'
          }
          onClick={() => scrollTabs(1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-right size-4" />
        </button>
      </Show>
    </div>
  )
}
