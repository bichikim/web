import {App} from 'vue'
import {createQuasarPlugin} from './quasar'
import {createRouter} from './router'
import {createStore} from './store'
import hyperComponents, {stitches} from 'src/plugins/hyper-components'
import urql from 'src/plugins/urql'

export const useAppPlugins = async (app: App, initialState, ssrContext = {}) => {

  const store = createStore(initialState)
  const quasarPlugin = await createQuasarPlugin(ssrContext)
  const router = createRouter()

  app.use(router)
  app.use(hyperComponents)
  app.use(quasarPlugin)
  app.use(store)
  app.use(urql)

  return {app, router, stitches}
}
