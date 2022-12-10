import {createWepApp} from './app'
import {Root} from './Root'
import reportWebVitals from './report-web-vitals'

const bootstrap = async () => {
  const {app, router} = await createWepApp({root: Root})
  await router.isReady()

  app.mount('#app')
}

await bootstrap()

console.log('Welcome to coong')

if (import.meta.env.VITE_WEB_VITALS) {
  reportWebVitals(console.log)
}
