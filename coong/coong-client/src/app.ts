import {App, Component, createApp, createSSRApp} from 'vue'
import {createRouter} from './routes'
import {createPinia} from 'pinia'
import {disableContextMenu} from 'src/plugins/disable-context-menu'
import {updateScreenHeight} from 'src/plugins/update-screen-height'

export interface CreateAppOptions {
  root: Component
}

const setup = (app: App) => {
  const pinia = createPinia()
  app.use(pinia)

  const router = createRouter()
  app.use(router)

  app.use(disableContextMenu)
  app.use(updateScreenHeight)

  return {
    router,
  }
}

export const createSsrApp = async ({root}: CreateAppOptions) => {
  const app = createSSRApp(root)
  const {router} = setup(app)
  return {app, router}
}

export const createWepApp = async ({root}: CreateAppOptions) => {
  const app = createApp(root)
  const {router} = setup(app)
  return {app, router}
}
