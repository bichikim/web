import createSsr from 'vite-ssr-vue'
import Root from './Root'
import createEmotion, {Emotion} from './emotion'
import {createRouter} from './router'
import {createQuasarPlugin} from './quasar/create-quasar-plugin'
import {createStore} from './store'

const esDefaultModule = <T>(module: T): T => (module as any)?.default ?? module

export default createSsr(Root, {
  created: async ({app, url, isClient, initialState, ...ssrContext}) => {
    const {emotion, install: emotionPlugin} = createEmotion()
    const router = createRouter()
    const store = createStore(initialState)
    const quasarPlugin = await createQuasarPlugin(ssrContext)
    app.use(router)
    app.use(emotionPlugin)
    app.use(quasarPlugin)
    app.use(store)
    
    if (!isClient && typeof url === 'string') {
      router.push(url)
      await router.isReady()
      const {renderToString}: any = await import('@vue/server-renderer')
      const createEmotionServer: any = esDefaultModule(await import('@emotion/server/create-instance'))
      const appContent = await renderToString(app, ssrContext)
      
      const emotionServer = createEmotionServer(emotion.cache)
      const {html, styles} = emotionServer.extractCriticalToChunks(appContent)
      const stylesInHead = emotionServer.constructStyleTagsFromChunks({html, styles})
      return {
        router,
        inserts: {
          body: html,
          headTags: stylesInHead
        }
      }
    }
    
    return {
      router,
    }
  }
})
