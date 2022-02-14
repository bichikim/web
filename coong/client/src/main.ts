import {createApp} from 'vue'
import Root from './pages/_root'
import {useAppPlugins} from './app-plugins'
import './global.css'

if (typeof window === 'object') {
  window.global = globalThis
}

const startApp = async () => {
  const app = createApp(Root)

  const {router} = await useAppPlugins(app, {})

  await router.isReady()

  app.mount('#app')
}

startApp()

export const deployFlag = 1
