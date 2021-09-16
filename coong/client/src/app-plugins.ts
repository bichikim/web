import {App} from 'vue'
import {createQuasarPlugin} from './quasar/create-quasar-plugin'
import {createRouter} from './router'
import {createStore} from './store'
import {createStitchesPlugin} from './stitches'

export const useAppPlugins = async (app: App, initialState, ssrContext = {}) => {

  const store = createStore(initialState)
  const quasarPlugin = await createQuasarPlugin(ssrContext)
  const router = createRouter()
  const {stitches, plugin: stitchesPlugin} = createStitchesPlugin()

  app.use(router)
  app.use(stitchesPlugin)
  app.use(quasarPlugin)
  app.use(store)

  return {app, router, stitches}
}
