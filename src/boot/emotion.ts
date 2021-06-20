import {createEmotion, EmotionPlugin} from '@winter-love/emotion'
import {BootCallback, BootFileParams} from '@quasar/app'
import {theme} from 'src/theme'
// import {EmptyObject} from '@winter-love/utils'

let _emotion: EmotionPlugin

export const emotion = () => {
  if (_emotion) {
    return _emotion
  }
  _emotion = createEmotion(theme)
  return _emotion
}

const emotionBoot: BootCallback<any> = (context: BootFileParams<any>) => {
  const {app, ssrContext} = context

  const _emotion = emotion()

  if (ssrContext) {
    ssrContext.req.__emotionCache__ = _emotion.cache
  }

  app.use(_emotion as any)
}

export default emotionBoot
