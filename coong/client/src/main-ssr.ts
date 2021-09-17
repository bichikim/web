import createSsr from 'vite-ssr-vue'
import Root from './Root'
import {useAppPlugins} from './app-plugins'

export default createSsr(Root, {
  created: async ({app, url, isClient, initialState, ...ssrContext}) => {
    const {router, stitches} = await useAppPlugins(app, initialState, ssrContext)

    if (!isClient && typeof url === 'string') {
      await router.push(url)
      await router.isReady()
      const {renderToString}: any = await import('@vue/server-renderer')

      const body: string = await renderToString(app, ssrContext)
      let headTags: string = ''

      if (stitches) {
        headTags += `<style id="stitches">${stitches.getCssText()}</style>`
      }

      return {
        inserts: {
          body,
          headTags,
        },
        router,
      }
    }

    return {
      router,
    }
  },
})
