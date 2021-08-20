import {createDirective} from '@winter-love/emotion'
import createEmotion, {Emotion} from '@emotion/css/create-instance'
import {Plugin} from 'vue'

const createEmotionPlugin = (): Plugin & {emotion: Emotion} => {
  const emotion = createEmotion({key: 'css'})
  return {
    emotion,
    install: (app) => {
      const emotionDirective = createDirective(emotion, {})
      app.directive('emotion', emotionDirective)
    },
  }
}

export default createEmotionPlugin
