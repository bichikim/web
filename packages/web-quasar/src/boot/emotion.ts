import {createEmotion} from '@winter-love/emotion'
import {BootCallback, BootFileParams} from '@quasar/app'
import {EmptyObject} from '@winter-love/utils'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // eslint-disable-next-line
      __emotion_cache__: any
    }
  }
}

const emotionBoot: BootCallback<EmptyObject> = (context: BootFileParams<EmptyObject>) => {
  const {ssrContext, app} = context
  if (!ssrContext) {
    return
  }

  const emotion = createEmotion()

  app.use(emotion)

  const {req} = ssrContext

  req.__emotion_cache__ = emotion.cache
}

export default emotionBoot
