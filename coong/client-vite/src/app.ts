import {App, Component, createApp, createSSRApp} from 'vue'
import {createRouter} from './routes'
import {createStoreDevTool, createVare} from 'vare'

export interface CreateAppOptions {
  Page: Component
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

export const createSsrApp = async ({Page}: CreateAppOptions) => {
  const app = createSSRApp(Page)
  const {router} = setup(app)
  return {app, router}
}

export const createWepApp = async ({Page}: CreateAppOptions) => {
  const app = createApp(Page)
  const {router} = setup(app)
  return {app, router}
}
