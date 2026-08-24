import {onMount} from 'solid-js'

/** Loads the local Apps in Toss panel only in its browser development runtime. */
export const useAppsInTossDevtools = (): void => {
  if (!import.meta.env.DEV || !import.meta.env.POMO_HAS_APPS_IN_TOSS_DEVTOOLS) {
    return
  }

  onMount(() => {
    import('@ait-co/devtools/panel').catch((error: unknown) => {
      console.error('Failed to load Apps in Toss DevTools.', error)
    })
  })
}
