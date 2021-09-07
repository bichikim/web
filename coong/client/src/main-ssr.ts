import createSsr from 'vite-ssr-vue'
import Root from './Root'
import {useAppModule} from './use-app-module'

const esDefaultModule = <T>(module: T): T => (module as any)?.default ?? module

export default createSsr(Root, {
  created: async ({app, url, isClient, initialState, ...ssrContext}) => {
    const {router, emotion} = await useAppModule(app, initialState, ssrContext)

    if (!isClient && typeof url === 'string') {
      await router.push(url)
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
          headTags: stylesInHead,
        },
      }
    }

    return {
      router,
    }
  },
})
