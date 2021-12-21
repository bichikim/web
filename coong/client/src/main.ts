import {createApp} from 'vue'
import Root from './Root'
import {useAppPlugins} from './app-plugins'
import './global.css'

const startApp = async () => {
  const app = createApp(Root)

  const {router} = await useAppPlugins(app, {})

  await router.isReady()

  app.mount('#app')
}

startApp()

export const deployFlag = 1
