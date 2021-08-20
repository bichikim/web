import {renderToString} from '@vue/server-renderer'
import {App} from 'vue'
import {Router} from 'vue-router'

export type CreateApp = () => {
  app: App
  router: Router
}

export const renderPreloadLink = (file: string) => {
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  } else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  } else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  } else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  } else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  } else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  }
  // TODO
  return ''

}

export const renderPreloadLinks = (modules: string[], manifest: Record<string, any>) => {
  let links = ''
  const seen = new Set()
  modules.forEach((id) => {
    const files = manifest[id]
    if (files) {
      files.forEach((file) => {
        if (!seen.has(file)) {
          seen.add(file)
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

export interface CreatePageRenderOptions {
  manifest?: Record<string, any>
  template?: string
}

export const createPageRender = (createApp: CreateApp, options: CreatePageRenderOptions) => {
  const {manifest = {}, template: htmlTemplate = ''} = options
  const {app, router} = createApp()

  return async (url: string, pageContext: Record<string, any>) => {
    router.push(url)
    await router.isReady()

    const context: Record<string, any> = {}
    const appHtml = await renderToString(app, context)
    const preloadLinks = renderPreloadLinks(context.modules, manifest)

    return htmlTemplate
      .replace('<!--preload-links-->', preloadLinks)
      .replace('<!--app-html-->', appHtml)
  }
}
