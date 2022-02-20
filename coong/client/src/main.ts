import {createRenderApp, SSRHtmlResult, SSRResult} from 'vite-plugin-ssr-vue'
import Root from './pages/_root'
import {useAppPlugins} from './app-plugins'
import './global.css'
const MAX = 200
const parseAttrs = (value: string, max: number = MAX) => {
  return Object.fromEntries(value.split(' ', max).map((item) => {
    const [key, value = ''] = item.split('=', 2)
    return [key, value]
  }))
}

const renderApp = createRenderApp(Root, async ({app, context, render}) => {
  const {router, stitches} = await useAppPlugins(app, {}, context)

  // ssr
  if (import.meta.env.SSR) {
    if (!context) {
      return
    }
    await router.push(context.url ?? '/')
    await router.isReady()
    const html: SSRHtmlResult = await render(context)

    if (!html) {
      return
    }

    const {
      _meta,
      // _moules,
    } = context
    html.appendHead = [
      ...html.appendHead ?? [],
      `<style id="stitches">${stitches.getCssText()}</style>`,
      _meta.endingHeadTags,
    ]

    html.bodyAttrs = {
      ...html.bodyAttrs,
      class: _meta.bodyClasses,
    }

    html.htmlAttrs = {
      ...html.htmlAttrs,
      ...parseAttrs(_meta.htmlAttrs),
    }

    // html.afterApp = [
    //   ...html.afterApp ?? [],
    //   renderLuggageToString(luggage, luggageKey),
    // ]

    return {
      html,
    } as SSRResult
  }

  // client
  // const data = getLuggage(luggageKey)
  // const {plugin: luggagePlugin} = createLuggagePlugin(data)
  // app.use(luggagePlugin)
  await router.isReady()
  render('#app')
})

if (!import.meta.env.SSR) {
  renderApp()
}

export default renderApp
