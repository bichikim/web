import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import type {InterfaceLanguagePort} from './types'

const STORAGE_KEY = 'wallpaper.interface-language'
export const nativeLanguage: InterfaceLanguagePort = {
  listen: async (receive) => {
    if (isTauri()) {
      return listen<'ko' | 'en'>('wallpaper-interface-language', ({payload}) => receive(payload))
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'ko' || event.newValue === 'en')) {
        receive(event.newValue)
      }
    }
    globalThis.addEventListener('storage', handleStorage)
    return () => globalThis.removeEventListener('storage', handleStorage)
  },
  read: async () => {
    if (isTauri()) {
      return invoke('interface_language')
    }
    return globalThis.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ko'
  },
  save: async (language) => {
    if (isTauri()) {
      await invoke('set_interface_language', {language})
    } else {
      globalThis.localStorage.setItem(STORAGE_KEY, language)
    }
  },
}
