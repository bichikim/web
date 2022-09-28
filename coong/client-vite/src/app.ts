import {App, Component, createApp, createSSRApp} from 'vue'
import {createRouter} from './routes'
import {createPinia} from 'pinia'

export interface CreateAppOptions {
  root: Component
}

const setup = (app: App) => {
  const pinia = createPinia()
  app.use(pinia)

  const router = createRouter()
  app.use(router)

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
