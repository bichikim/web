import {useResizeObserver} from 'src/hooks/use-resize-observer'
import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {shouldWrapToolbar} from './should-wrap-toolbar'

export const useToolbarWrap = (
  element: Accessor<HTMLDivElement | null>,
  enabled: Accessor<boolean>,
): Accessor<boolean> => {
  const [wrap, setWrap] = createSignal(false)
  createEffect(() => {
    if (!enabled()) {
      setWrap(false)
      return
    }
    const actions = element()
    if (!actions || typeof ResizeObserver === 'undefined') {
      return
    }
    const toolbar = actions.parentElement
    const container = toolbar?.parentElement
    if (!toolbar || !container) {
      return
    }
    let pomodoro: HTMLElement | null = null
    const measure = () => {
      if (!pomodoro) {
        setWrap(false)
        return
      }
      const controlWidths = Array.from(
        actions.children,
        (child) => child.getBoundingClientRect().width,
      )
      const gap = Number.parseFloat(getComputedStyle(actions).columnGap) || 0
      const floating = getComputedStyle(pomodoro).cssFloat !== 'none'
      const reserved = floating
        ? pomodoro.getBoundingClientRect().width +
          (Number.parseFloat(getComputedStyle(pomodoro).marginRight) || 0)
        : 0
      setWrap(
        floating &&
          shouldWrapToolbar({
            availableWidth: toolbar.getBoundingClientRect().width - reserved,
            controlWidths,
            gap,
          }),
      )
    }
    const [targets, setTargets] = createSignal<ReadonlyArray<Element>>([])
    const resize = useResizeObserver({onResize: measure, target: targets})
    resize.start()
    const observe = () => {
      pomodoro = container.querySelector<HTMLElement>('.pomo-pomodoro')
      setTargets([toolbar, ...(pomodoro === null ? [] : [pomodoro]), ...actions.children])
      measure()
    }
    const mutation = new MutationObserver(observe)
    mutation.observe(container, {childList: true, subtree: true})
    observe()
    onCleanup(() => {
      mutation.disconnect()
    })
  })
  return wrap
}
