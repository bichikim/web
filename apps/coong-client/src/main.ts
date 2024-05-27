import {createWepApp} from './app'
import {Root} from './Root'
import reportWebVitals from './report-web-vitals'
import './normalize.css'
import 'virtual:uno.css'

const bootstrap = async () => {
  const {app, router} = await createWepApp({root: Root})
  await router.isReady()

  app.mount('#app')
}

bootstrap().then(() => {
  console.info('Welcome to coong')
})

if (import.meta.env.VITE_WEB_VITALS) {
  reportWebVitals(console.info)
}
