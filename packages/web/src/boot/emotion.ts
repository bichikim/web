import {createEmotion, EmotionPlugin} from '@winter-love/emotion'
import {BootCallback, BootFileParams} from '@quasar/app'
import {EmptyObject} from '@winter-love/utils'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // eslint-disable-next-line
      __emotionCache__: any
    }

    interface Response {
      // eslint-disable-next-line
      __emotionCache__: any
    }
  }
}

let emotion: EmotionPlugin

export const _createEmotion = () => {
  if (emotion) {
    return emotion
  }
  emotion = createEmotion()
  return emotion
}

const emotionBoot: BootCallback<EmptyObject> = (context: BootFileParams<EmptyObject>) => {
  const {app} = context

  const emotion = _createEmotion()

  app.use(emotion)
}

export default emotionBoot
