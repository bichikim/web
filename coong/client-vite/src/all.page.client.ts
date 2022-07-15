import {getPage} from 'vite-plugin-ssr/client'
import {createSsrApp} from './app'
import './index.css'

export const hydrate = async () => {
  const pageContext = await getPage()
  console.log(import.meta.env.SSR)
  const {Page} = pageContext
  const {app, router} = await createSsrApp({Page})
  await router.isReady()
  app.mount('#app')
}

hydrate()
