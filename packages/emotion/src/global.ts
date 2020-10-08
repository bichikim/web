import {Interpolation, serializeStyles} from '@emotion/serialize'
import {EmotionCache, SerializedStyles} from '@emotion/utils'
import {Plugin, App} from 'vue'
import {useCache} from './emotion'

function insertWithoutScoping(cache: EmotionCache, serialized: SerializedStyles) {
  if (cache.inserted[serialized.name] === undefined) {
    return cache.insert('', serialized, cache.sheet, true)
  }
}

export const createGlobalStyle = (
  ...styles: Array<TemplateStringsArray | Interpolation<any>>
): Plugin => {
  return {
    install(app: App) {
      app.mixin({
        setup() {
          const cache = useCache()
          return {
            cache,
          }
        },
        beforeMount() {
          if (this.$root !== this) {
            return
          }
          const {cache} = this
          const serialized = serializeStyles(styles, cache.registered, {})
          insertWithoutScoping(cache, serialized)
        },
      })
    },
  }
}
