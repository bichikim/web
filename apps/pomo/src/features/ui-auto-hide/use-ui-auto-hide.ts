import {createEffect, on, onCleanup, onMount} from 'solid-js'
import {useInactivity} from 'src/hooks/use-inactivity'
import {useVisibilityPreferences} from './use-visibility-preferences'

const MILLISECONDS_PER_SECOND = 1000

const hasVisibleOverlay = () =>
  Array.from(
    document.querySelectorAll(
      '[role="dialog"], dialog[open], [role="alertdialog"], [role="tooltip"]',
    ),
  ).some((overlay) => overlay.getClientRects().length > 0)

/** Connects persisted visibility preferences to browser inactivity. */
export const useUiAutoHide = () => {
  const settings = useVisibilityPreferences()
  const inactivity = useInactivity({
    capture: () => true,
    isBlocked: hasVisibleOverlay,
    timeoutMs: () => settings.preferences().seconds * MILLISECONDS_PER_SECOND,
  })
  createEffect(
    on(
      () => settings.preferences().enabled,
      (enabled) => {
        if (enabled) {
          inactivity.start()
        } else {
          inactivity.stop()
        }
      },
    ),
  )
  onMount(() => {
    const overlayObserver = new MutationObserver(() => {
      if (hasVisibleOverlay()) {
        inactivity.reset()
      }
    })
    overlayObserver.observe(document.body, {
      attributeFilter: ['aria-hidden', 'hidden', 'open', 'role'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    onCleanup(() => {
      overlayObserver.disconnect()
    })
  })
  return {
    enabled: () => settings.preferences().enabled,
    hidden: inactivity.inactive,
    onEnabledChange: settings.onEnabledChange,
    onSecondsChange: settings.onSecondsChange,
    seconds: () => settings.preferences().seconds,
  }
}
