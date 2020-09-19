import {App} from 'vue'
import createCache from '@emotion/cache'

interface VueEmotion {
  install: (app: App) => void
}

export const createEmotion = (): VueEmotion => {
  return {
    install(app: App) {
      app.mixin({
        beforeCreate() {
          this.$emotionCache = (this.$parent && this.$parent.$emotionCache) || createCache()
          this.$emotionCache.compat = true
        },
      })
    },
  }
}

export default createEmotion
