import {Interpolation, serializeStyles} from '@emotion/serialize'
import {EmotionCache, SerializedStyles} from '@emotion/utils'
import {defineComponent} from 'vue'

function insertWithoutScoping(cache: EmotionCache, serialized: SerializedStyles) {
  if (cache.inserted[serialized.name] === undefined) {
    return cache.insert('', serialized, cache.sheet, true)
  }
}

export const createGlobalStyle = (
  ...styles: Array<TemplateStringsArray | Interpolation<any>>
): ReturnType<typeof defineComponent> => {
  return defineComponent({

    setup(props, {attrs}) {
      return (context: any) => {
        const {$parent} = context
        const cache = $parent.$emotionCache
        const mergedProps = {...attrs, ...$parent.$evergarden}
        const serialized = serializeStyles(styles, cache.registered, mergedProps)
        insertWithoutScoping(cache, serialized)
      }
    },
  })
}
