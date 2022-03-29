import {App} from 'vue'
import {createQuasarPlugin} from './quasar'
import {createRouter} from './router'
import hyperComponents, {stitches} from 'src/plugins/hyper-components'
import urql from 'src/plugins/urql'
import {createHead} from '@vueuse/head'
import {createVareStore} from 'vare'

export const useAppPlugins = (app: App, initialState, ssrContext = {}) => {
  const head = createHead()
  const store = createVareStore()
  const quasarPlugin = createQuasarPlugin(ssrContext)
  const router = createRouter()
  app.use(router)
  app.use(hyperComponents)
  app.use(quasarPlugin)
  app.use(store.install)
  app.use(head)
  app.use(urql)
  return {app, head, router, stitches, store: store.manager.storeTree}
}
