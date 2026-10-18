import {createEffect, createResource, onCleanup} from 'solid-js'
import {useAuth} from '../auth'
import {CLOUD_TEXT_USAGE_EVENT, readCloudTextUsage} from './client'

/** Refreshes account usage on login, generation completion, and return to the app. */
export const useCloudTextUsage = () => {
  const authentication = useAuth()
  const [usage, {refetch}] = createResource(authentication.session, async (session) => ({
    session,
    usage: await readCloudTextUsage(),
  }))
  createEffect(() => {
    if (authentication.session() === null) {
      return
    }
    const refresh = () => {
      refetch()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch()
      }
    }
    globalThis.addEventListener('focus', refresh)
    globalThis.addEventListener(CLOUD_TEXT_USAGE_EVENT, refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    onCleanup(() => {
      globalThis.removeEventListener('focus', refresh)
      globalThis.removeEventListener(CLOUD_TEXT_USAGE_EVENT, refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    })
  })
  return {
    error: () => usage.error !== undefined,
    usage: () => {
      const session = authentication.session()
      if (
        session === null ||
        usage.error !== undefined ||
        usage.state === 'pending' ||
        usage.state === 'unresolved'
      ) {
        return null
      }
      const current = usage.latest
      return current?.session === session ? current.usage : null
    },
  }
}
