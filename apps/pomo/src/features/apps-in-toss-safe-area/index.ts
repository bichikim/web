import {onCleanup, onMount} from 'solid-js'

const safeAreaProperties = {
  bottom: '--pomo-safe-area-inset-bottom',
  left: '--pomo-safe-area-inset-left',
  right: '--pomo-safe-area-inset-right',
  top: '--pomo-safe-area-inset-top',
} as const

interface SafeAreaInsetsValue {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

const applySafeAreaInsets = (insets: SafeAreaInsetsValue): void => {
  const {style} = document.documentElement
  const {bottom, left, right, top} = insets

  style.setProperty(safeAreaProperties.bottom, `${bottom}px`)
  style.setProperty(safeAreaProperties.left, `${left}px`)
  style.setProperty(safeAreaProperties.right, `${right}px`)
  style.setProperty(safeAreaProperties.top, `${top}px`)
}

/** Synchronizes Apps in Toss native safe-area values with the document CSS variables. */
export const useAppsInTossSafeArea = (): void => {
  if (!import.meta.env.POMO_IS_APPS_IN_TOSS) {
    return
  }

  let disposeSubscription: (() => void) | undefined
  let disposed = false

  onMount(() => {
    import('@apps-in-toss/web-framework')
      .then(({SafeAreaInsets}) => {
        if (disposed) {
          return
        }

        applySafeAreaInsets(SafeAreaInsets.get())
        disposeSubscription = SafeAreaInsets.subscribe({onEvent: applySafeAreaInsets})
      })
      .catch(globalThis.reportError)
  })

  onCleanup(() => {
    disposed = true
    disposeSubscription?.()
  })
}
