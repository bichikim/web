import {createWepApp} from './app'
import {Root} from './Root'
import './hack.css'

const bootstrap = async () => {
  const {app, router} = await createWepApp({page: Root})
  await router.isReady()

  app.mount('#app')
}

bootstrap()
