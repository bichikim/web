import {createWepApp} from './app'
import {Root} from './Root'
import reportWebVitals from './report-web-vitals'
import './normalize.css'

const bootstrap = async () => {
  const {app, router} = await createWepApp({root: Root})
  await router.isReady()

  app.mount('#app')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
bootstrap().then(() => {
  console.log('Welcome to coong')
})

if (import.meta.env.VITE_WEB_VITALS) {
  reportWebVitals(console.log)
}
