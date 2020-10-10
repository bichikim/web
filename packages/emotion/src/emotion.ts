import {App, inject} from 'vue'
import createCache, {EmotionCache} from '@emotion/cache'

export const cacheSym = Symbol('cache')

interface VueEmotion {
  install: (app: App) => void
}

export const useCache = (): EmotionCache | null => {
  return inject(cacheSym, null)
}

export const createEmotion = (): VueEmotion => {
  return {
    install(app: App) {
      app.provide(cacheSym, createCache())
    },
  }
}

export default createEmotion
