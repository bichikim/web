import {renderToString} from '@vue/server-renderer'
import {dangerouslySkipEscape, escapeInject} from 'vite-plugin-ssr'
import {createSsrApp} from './app'

export async function render(pageContext): Promise<any> {
  const {Page, url} = pageContext
  const {app, router} = await createSsrApp({Page})

  // set the router to the desired URL before rendering
  await router.push(url)
  await router.isReady()

  const appHtml = await renderToString(app)

  console.log(import.meta.env.SSR)

  return escapeInject`<!DOCTYPE html>
    <html lang="en">
      <body data-mode="ssr">
        <div id="app">${dangerouslySkipEscape(appHtml)}</div>
      </body>
    </html>`
}
