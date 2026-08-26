import {createSignal} from 'solid-js'

import {signOutAdminSession} from './session'

export interface AdminDashboardController {
  readonly isSigningOut: () => boolean
  readonly onSignOut: () => Promise<boolean>
}

export const useAdminDashboard = (): AdminDashboardController => {
  const [isSigningOut, setIsSigningOut] = createSignal(false)

  const onSignOut = async () => {
    setIsSigningOut(true)

    try {
      const wasSignedOut = await signOutAdminSession()

      if (!wasSignedOut) {
        return false
      }

      return true
    } catch {
      return false
    } finally {
      setIsSigningOut(false)
    }
  }

  return {
    isSigningOut,
    onSignOut,
  }
}
