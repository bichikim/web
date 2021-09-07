import {App} from 'vue'
import createEmotion from './emotion'
import {createQuasarPlugin} from './quasar/create-quasar-plugin'
import {createRouter} from './router'
import {createStore} from './store'

export const useAppModule = async (app: App, initialState, ssrContext = {}) => {

  const store = createStore(initialState)
  const quasarPlugin = await createQuasarPlugin(ssrContext)
  const router = createRouter()
  const {emotion, install: emotionPlugin} = createEmotion()

  app.use(router)
  app.use(emotionPlugin)
  app.use(quasarPlugin)
  app.use(store)

  return {app, emotion, router}
}
