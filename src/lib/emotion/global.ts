import {Interpolation, serializeStyles} from '@emotion/serialize'
import {EmotionCache, SerializedStyles} from '@emotion/utils'
import {defineComponent} from 'vue'

function insertWithoutScoping(cache: EmotionCache, serialized: SerializedStyles) {
  if (cache.inserted[serialized.name] === undefined) {
    // todo
    // return cache.insert('', serialized, cache.sheet, true)
  }
}

export const createGlobalStyle = (...styles: Array<TemplateStringsArray | Interpolation<any>>): ReturnType<typeof defineComponent> => {
  return defineComponent({

    setup(props, {attrs}) {
      // todo
      // const cache = parent.$emotionCache
      const cache: any = {}
      const mergedProps = {...attrs, ...props}
      const serialized = serializeStyles(styles, cache.registered, mergedProps)
      insertWithoutScoping(cache, serialized)
    },
    // render(_, {parent, data}) {
    //   const cache = parent.$emotionCache
    //   const mergedProps = {...data.attrs, ...parent.$evergarden}
    //   const serialized = serializeStyles(styles, cache.registered, mergedProps)
    //   insertWithoutScoping(cache, serialized)
    // },
  })
}
