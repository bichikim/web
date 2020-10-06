import {Interpolation, serializeStyles} from '@emotion/serialize'
import {EmotionCache, SerializedStyles} from '@emotion/utils'
import {defineComponent, Plugin, App} from 'vue'
import {useCache} from 'packages/ui/emotion/emotion'

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
      const serialized = serializeStyles(styles, cache.registered, mergedProps)
      insertWithoutScoping(cache, serialized)
    },
  }
}
