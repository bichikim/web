import {App, createApp as createSPAApp, createSSRApp} from 'vue'
import {Router} from 'vue-router'
import {createRouter} from './router'
import Root from './Root'
import {createQuasarPlugin} from './quasar'
import createEmotion, {Emotion} from './emotion'

export type CreateApp = (ssrContext?: any) => {
  app: App
  emotion: Emotion
  router: Router
}

export const createApp: CreateApp = (ssrContext = {}) => {
  let app
  if (import.meta.env.SSR) {
    app = createSSRApp(Root)
  } else {
    app = createSPAApp(Root)
  }

  const quasarPlugin = createQuasarPlugin(ssrContext)

  app.use(quasarPlugin)

  const router = createRouter()

  const {emotion, install: emotionPlugin} = createEmotion()

  app.use(router)
  app.use(emotionPlugin)

  return {app, emotion, router}
}
