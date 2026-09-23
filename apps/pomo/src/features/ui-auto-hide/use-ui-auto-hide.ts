import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {createInactivityController} from './create-inactivity-controller'
import {useVisibilityPreferences} from './use-visibility-preferences'

const hasVisibleDialog = () =>
  Array.from(document.querySelectorAll('[role="dialog"], dialog[open], [role="alertdialog"]')).some(
    (dialog) => dialog.getClientRects().length > 0,
  )

/** Connects persisted visibility preferences to browser inactivity. */
export const useUiAutoHide = () => {
  const settings = useVisibilityPreferences()
  const [hidden, setHidden] = createSignal(false)
  onMount(() => {
    const inactivity = createInactivityController({
      enabled: () => settings.preferences().enabled,
      isBlocked: hasVisibleDialog,
      isSuspended: () => document.visibilityState === 'hidden',
      onHiddenChange: setHidden,
      schedule: (expire, milliseconds) => {
        const timeout = globalThis.setTimeout(expire, milliseconds)
        return () => globalThis.clearTimeout(timeout)
      },
      seconds: () => settings.preferences().seconds,
    })
    for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const) {
      useEvent(globalThis.window, event, inactivity.wake, {capture: true, passive: true})
    }
    useEvent(document, 'visibilitychange', inactivity.wake)
    const dialogObserver = new MutationObserver(() => {
      if (hasVisibleDialog()) {
        inactivity.wake()
      }
    })
    dialogObserver.observe(document.body, {
      attributeFilter: ['aria-hidden', 'hidden', 'open', 'role'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    createEffect(inactivity.wake)
    onCleanup(() => {
      dialogObserver.disconnect()
      inactivity.dispose()
    })
  })
  return {
    enabled: () => settings.preferences().enabled,
    hidden,
    onEnabledChange: settings.onEnabledChange,
    onSecondsChange: settings.onSecondsChange,
    seconds: () => settings.preferences().seconds,
  }
}
