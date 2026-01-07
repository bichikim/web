import {onMount} from 'solid-js'
import {fontImport} from './font-import'

/**
 * Creates a singleton font load scheduler.
 * Uses requestIdleCallback if available, otherwise falls back to requestAnimationFrame + setTimeout.
 *
 * This function is idempotent - calling it multiple times has no effect after the first call.
 */
const createScheduleFontLoad = (): (() => void) => {
  let isScheduled = false

  return () => {
    if (isScheduled) {
      return
    }

    isScheduled = true

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => fontImport())
    } else {
      requestAnimationFrame(() => {
        setTimeout(() => fontImport(), 0)
      })
    }
  }
}

const scheduleFontLoad = createScheduleFontLoad()

/**
 * Deferred font loading component for client-side only.
 *
 * Fonts are the least critical resource for content rendering.
 * This component loads fonts after hydration when the browser is idle,
 * allowing critical resources (HTML, CSS, JS) to load first.
 */
export const FontImport = () => {
  onMount(() => {
    scheduleFontLoad()
  })

  return null
}
