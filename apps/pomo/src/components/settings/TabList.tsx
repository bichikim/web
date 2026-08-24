import {Tabs} from '@kobalte/core/tabs'
import {createEffect, createSignal, type JSX, onCleanup, Show} from 'solid-js'
import * as m from '../../paraglide/messages.js'

const SETTINGS_TAB_LIST_CLASSES =
  'pomo-settings__tabs flex h-full w-full min-w-0 flex-1 overflow-x-auto overscroll-x-contain ' +
  '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [touch-action:pan-x] ' +
  '[&::-webkit-scrollbar]:hidden'

const SETTINGS_TAB_SCROLL_BUTTON_CLASSES =
  'absolute inset-y-0 flex w-6 cursor-pointer items-center border-0 p-0 ' +
  'text-muted-foreground outline-none transition-colors hover:text-foreground ' +
  'focus-visible:text-highlight motion-reduce:transition-none'

const TAB_SCROLL_RATIO = 0.7

const SETTINGS_TAB_CLASSES =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 ' +
  'whitespace-nowrap border-0 rounded-0 bg-transparent px-4 ' +
  'text-[0.8125rem] font-700 text-muted-foreground ' +
  'shadow-[inset_0_-0.1875rem_0_transparent] outline-none ' +
  'transition-[background-color_140ms_ease,box-shadow_140ms_ease,color_140ms_ease] ' +
  'hover:bg-secondary-soft hover:text-foreground ' +
  'ui-selected:bg-transparent ui-selected:text-foreground ' +
  'ui-selected:shadow-tab-active ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] ' +
  'focus-visible:outline-highlight ' +
  'motion-reduce:transition-none'

export const PSettingsTabList = () => {
  const [canScrollTabsLeft, setCanScrollTabsLeft] = createSignal(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = createSignal(false)
  const [tabListElement, setTabListElement] = createSignal<HTMLDivElement>()
  const updateTabScrollHints = (element: HTMLDivElement) => {
    const edgeTolerance = 1

    setCanScrollTabsLeft(element.scrollLeft > edgeTolerance)
    setCanScrollTabsRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - edgeTolerance,
    )
  }
  const handleTabListScroll: JSX.EventHandler<HTMLDivElement, Event> = (event) => {
    updateTabScrollHints(event.currentTarget)
  }
  const scrollTabs = (direction: -1 | 1) => {
    const element = tabListElement()

    if (element === undefined) {
      return
    }

    element.scrollBy({
      behavior: 'smooth',
      left: direction * element.clientWidth * TAB_SCROLL_RATIO,
    })
  }

  createEffect(() => {
    const element = tabListElement()

    if (element === undefined) {
      return
    }

    updateTabScrollHints(element)

    const resizeObserver = new ResizeObserver(() => updateTabScrollHints(element))
    resizeObserver.observe(element)
    onCleanup(() => resizeObserver.disconnect())
  })

  return (
    <div class="relative h-full min-w-0">
      <Tabs.List
        ref={setTabListElement}
        class={SETTINGS_TAB_LIST_CLASSES}
        aria-label={m.settings_category_label()}
        onScroll={handleTabListScroll}
      >
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="general">
          <span aria-hidden="true" class="i-tabler-adjustments-horizontal size-4" />
          <span>{m.settings_tab_general()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="events">
          <span aria-hidden="true" class="i-tabler-bolt size-4" />
          <span>{m.settings_tab_events()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="feeds">
          <span aria-hidden="true" class="i-tabler-rss size-4" />
          <span>{m.settings_tab_feeds()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="dialogue-library">
          <span aria-hidden="true" class="i-tabler-message-circle size-4" />
          <span>{m.settings_tab_dialogue()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="user">
          <span aria-hidden="true" class="i-tabler-user-circle size-4" />
          <span>{m.settings_tab_user()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="guide">
          <span aria-hidden="true" class="i-tabler-help-circle size-4" />
          <span>{m.settings_tab_guide()}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={SETTINGS_TAB_CLASSES} value="credits">
          <span aria-hidden="true" class="i-tabler-heart size-4" />
          <span>{m.settings_tab_credits()}</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Show when={canScrollTabsLeft()}>
        <button
          aria-label={m.settings_previous_tab()}
          class={
            `${SETTINGS_TAB_SCROLL_BUTTON_CLASSES} left-0 justify-start ` +
            'bg-gradient-to-r from-surface-strong to-transparent'
          }
          onClick={() => scrollTabs(-1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-left size-4" />
        </button>
      </Show>
      <Show when={canScrollTabsRight()}>
        <button
          aria-label={m.settings_next_tab()}
          class={
            `${SETTINGS_TAB_SCROLL_BUTTON_CLASSES} right-0 justify-end ` +
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
