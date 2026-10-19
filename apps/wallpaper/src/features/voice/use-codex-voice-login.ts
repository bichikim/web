import {createResource} from 'solid-js'
import {invoke, isTauri} from '@tauri-apps/api/core'

/** Checks local Codex credentials without returning credentials or requesting speech. */
export const useCodexVoiceLogin = () => {
  const [status, {refetch}] = createResource(async () => {
    if (!isTauri()) {
      return 'desktopOnly' as const
    }
    try {
      await invoke('codex_voice_login_status')
      return 'ready' as const
    } catch (cause) {
      if (cause === 'loginRequired') {
        return 'loginRequired' as const
      }
      console.error('Poffo Codex voice login check failed', cause)
      return 'unavailable' as const
    }
  })
  return {refresh: refetch, status}
}
