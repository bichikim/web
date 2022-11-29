import {createRouter} from './routes'
import {Root} from './Root'
import {createApp} from 'vue'
import {createPinia} from 'pinia'
import {createQuery} from './requests'
import 'uno.css'

const setup = () => {
  const app = createApp(Root)
  const pinia = createPinia()
  const router = createRouter()
  const query = createQuery()
  app.use(pinia)
  app.use(router)
  app.use(query)

  return {
    app,
    pinia,
    router,
  }
}

const bootstrap = async () => {
  const {app, router} = setup()

  await router.isReady()

  app.mount('#app')
}

await bootstrap()

console.log('Welcome to Web')
