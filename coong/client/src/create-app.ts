import {createApp as createSPAApp, createSSRApp} from 'vue'
import {createRouter} from './router'
import Root from './Root'
import {initQuasar} from './quasar'
import createEmotion from './emotion'

export const createApp = () => {
  const ssr = Boolean(import.meta.env.SSR)
  let app
  if (ssr) {
    app = createSSRApp(Root)
  } else {
    app = createSPAApp(Root)
  }

  app.use(initQuasar)

  const router = createRouter()

  const {emotion, install: emotionPlugin} = createEmotion()

  app.use(router)
  app.use(emotionPlugin)

  return {app, emotion, router}
}
