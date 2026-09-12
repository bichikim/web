import {createSignal, onCleanup, onMount} from 'solid-js'

export const useToolbarWrap = () => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [wrap, setWrap] = createSignal(false)
  onMount(() => {
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
      const children = Array.from(actions.children).filter(
        (child) => child.getBoundingClientRect().width > 0,
      )
      const gap = Number.parseFloat(getComputedStyle(actions).columnGap) || 0
      const needed =
        children.reduce((width, child) => width + child.getBoundingClientRect().width, 0) +
        Math.max(0, children.length - 1) * gap
      const floating = getComputedStyle(pomodoro).cssFloat !== 'none'
      const reserved = floating
        ? pomodoro.getBoundingClientRect().width +
          (Number.parseFloat(getComputedStyle(pomodoro).marginRight) || 0)
        : 0
      setWrap(floating && needed > toolbar.getBoundingClientRect().width - reserved)
    }
    const resize = new ResizeObserver(measure)
    const observe = () => {
      resize.disconnect()
      pomodoro = container.querySelector<HTMLElement>('.pomo-pomodoro')
      resize.observe(toolbar)
      if (pomodoro) {
        resize.observe(pomodoro)
      }
      for (const child of actions.children) {
        resize.observe(child)
      }
      measure()
    }
    const mutation = new MutationObserver(observe)
    mutation.observe(container, {childList: true, subtree: true})
    observe()
    onCleanup(() => {
      resize.disconnect()
      mutation.disconnect()
    })
  })
  return {setElement, wrap}
}
