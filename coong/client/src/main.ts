import {createApp} from 'vue'
import Root from './Root'
import {useAppPlugins} from './app-plugins'

const startApp = async () => {
  const app = createApp(Root)

  const {router} = await useAppPlugins(app, {})

  await router.isReady()

  app.mount('#app')
}

startApp()
