import fs from 'fs'
import {parse} from 'node-html-parser'
import path from 'path'
import type {Connect, ViteDevServer} from 'vite'
import {SSRResult} from './create-render-app'
import {defaultModule} from './default-module'
import {entryFromTemplate} from './entry-from-template'
import {insertTags} from './insert-tags'
import {insertTeleports} from './insert-teleports'
import {GET} from './methods'
import {setHeaders} from './set-headers'
import {OK} from './status'
import {SERVER_RENDERED_KEY} from './keys'

export interface CreateServerHandlerOptions {
  /**
   * @default body #app
   */
  appSelector?: string
  entry?: string
}

const readHtmlTemplate = async (
  server: ViteDevServer,
  url: string,
  template: string = 'index.html',
) => {
  const filePath = path.resolve(server.config.root, template)
  return server.transformIndexHtml(url, await fs.promises.readFile(filePath, 'utf8'))
}

export const readDefaultModule = async (server: ViteDevServer, modulePath: string) => {
  const filePath = path.join(server.config.root, modulePath)
  return defaultModule(await server.ssrLoadModule(filePath))
}

export const createServerHandler = (
  server: ViteDevServer,
  options: CreateServerHandlerOptions = {},
): Connect.NextHandleFunction => {
  const {entry: ssrEntry, appSelector = 'body #app'} = options
  // eslint-disable-next-line max-statements
  return async (req, res, next) => {
    if (req.method !== GET || !req.originalUrl) {
      return next()
    }

    try {
      const htmlTemplate = await readHtmlTemplate(server, req.originalUrl)
      const htmlElement = parse(htmlTemplate)
      const entry = ssrEntry ?? entryFromTemplate(htmlElement)
      const url = req.originalUrl
      if (!entry) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error('Entry point for ssr not found')
      }
      const render = await readDefaultModule(server, entry)
      if (typeof render !== 'function') {
        return new Error('Entry point for ssr not found')
      }
      const context = {req, res, url}
      const {
        html: {app, afterApp, appendHead, prependHead, htmlAttrs, bodyAttrs, beforeApp, teleports},
        response,
      }: SSRResult = await render({context})

      const appElement = htmlElement.querySelector(appSelector)
      if (appElement) {
        appElement.innerHTML = app
      }
      insertTags(htmlElement, 'head', 'beforeend', appendHead)
      insertTags(htmlElement, 'head', 'afterbegin', prependHead)
      //
      insertTags(htmlElement, appSelector, 'afterend', afterApp)
      insertTags(htmlElement, appSelector, 'beforebegin', beforeApp)
      if (htmlAttrs) {
        const rootElement = htmlElement.querySelector('html')
        rootElement?.setAttributes(htmlAttrs)
      }
      const bodyElement = htmlElement.querySelector('body')
      if (bodyAttrs) {
        bodyElement?.setAttributes(bodyAttrs)
      }
      // announce html is rendered by SSR
      bodyElement?.setAttributes({
        [SERVER_RENDERED_KEY]: '',
      })
      insertTeleports(htmlElement, teleports)
      res.statusCode = response?.status ?? OK
      res.setHeader('Content-Type', 'text/html')
      setHeaders(res, response?.headers)
      res.end(htmlElement.toString())
    } catch (error: any) {
      server.ssrFixStacktrace(error)
    }
  }
}
