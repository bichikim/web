import {useClientAsync} from '@winter-love/solid-use/client-async'

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
  const {bottom, left, right} = insets

  style.setProperty(safeAreaProperties.bottom, `${bottom}px`)
  style.setProperty(safeAreaProperties.left, `${left}px`)
  style.setProperty(safeAreaProperties.right, `${right}px`)
  // The Toss utility header already owns the top safe area.
  style.setProperty(safeAreaProperties.top, '0rem')
}

/** Synchronizes native insets while excluding the Toss utility header. */
export const AppsInToss = () => {
  useClientAsync(
    () => import('@apps-in-toss/web-framework'),
    ({SafeAreaInsets}) => {
      applySafeAreaInsets(SafeAreaInsets.get())
      return SafeAreaInsets.subscribe({onEvent: applySafeAreaInsets})
    },
    (error) => {
      console.error('Failed to synchronize Apps in Toss safe-area values.', error)
    },
  )

  return null
}
