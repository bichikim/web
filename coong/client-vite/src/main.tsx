import {createWepApp} from './app'
import {Root} from './Root'
import './index.css'
import './hack.css'

const bootstrap = async () => {
  const {app, router} = await createWepApp({Page: Root})
  await router.isReady()

  app.mount('#app')
}

bootstrap()
