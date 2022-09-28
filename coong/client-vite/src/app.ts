import {App, Component, createApp, createSSRApp} from 'vue'
import {createRouter} from './routes'
import {createStoreDevTool, createVare} from 'vare'

export interface CreateAppOptions {
  page: Component
}

const setup = (app: App) => {
  const router = createRouter()
  app.use(router)

  const vare: any = createVare()
  app.use(vare)

  if (process.env.CLIENT) {
    createStoreDevTool(app, [
      {
        info: {
          kind: 'state',
        },
        store: vare.manager.store,
      },
    ])
  }

  return {
    router,
  }
}

export const createSsrApp = async ({page}: CreateAppOptions) => {
  const app = createSSRApp(page)
  const {router} = setup(app)
  return {app, router}
}

export const createWepApp = async ({page}: CreateAppOptions) => {
  const app = createApp(page)
  const {router} = setup(app)
  return {app, router}
}
