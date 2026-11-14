import {createSignal, onCleanup, onMount} from 'solid-js'
import {normalizeThemeColor} from './normalize-theme-color'

/** Keeps the runtime background picker aligned with the inherited canvas theme. */
export const useCanvasColor = () => {
  const [color, setColor] = createSignal('#111715')
  onMount(() => {
    const root = document.documentElement
    const update = () => {
      const style = getComputedStyle(root)
      setColor(
        normalizeThemeColor(
          root,
          style.getPropertyValue('--puppet-color-canvas').trim() ||
            style.getPropertyValue('--puppet-default-color-canvas').trim() ||
            '#111715',
        ),
      )
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, {attributeFilter: ['class', 'style'], attributes: true})
    onCleanup(() => observer.disconnect())
  })
  return color
}
