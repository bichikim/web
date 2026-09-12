import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {createInactivityController} from './create-inactivity-controller'
import {useVisibilityPreferences} from './use-visibility-preferences'

/** Connects persisted visibility preferences to browser inactivity. */
export const useUiAutoHide = () => {
  const settings = useVisibilityPreferences()
  const [hidden, setHidden] = createSignal(false)
  onMount(() => {
    const inactivity = createInactivityController({
      enabled: () => settings.preferences().enabled,
      isBlocked: () =>
        Array.from(
          document.querySelectorAll('[role="dialog"], dialog[open], [role="alertdialog"]'),
        ).some((dialog) => dialog.getClientRects().length > 0),
      isSuspended: () => document.visibilityState === 'hidden',
      onHiddenChange: setHidden,
      schedule: (expire, milliseconds) => {
        const timeout = globalThis.setTimeout(expire, milliseconds)
        return () => globalThis.clearTimeout(timeout)
      },
      seconds: () => settings.preferences().seconds,
    })
    for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const) {
      useEvent(window, event, inactivity.wake, {capture: true, passive: true})
    }
    useEvent(document, 'visibilitychange', inactivity.wake)
    createEffect(inactivity.wake)
    onCleanup(inactivity.dispose)
  })
  return {
    enabled: () => settings.preferences().enabled,
    hidden,
    onEnabledChange: settings.onEnabledChange,
    onSecondsChange: settings.onSecondsChange,
    seconds: () => settings.preferences().seconds,
  }
}
