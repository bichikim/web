import fs from 'fs'
import http from 'http'
import {HTMLElement, parse} from 'node-html-parser'
import path from 'path'
import type {Connect, ViteDevServer} from 'vite'
import {Headers} from './types'
import {SSRResult} from './create-render-app'
type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

export interface CreateHandlerOptions {
  /**
   * @default body #app
   */
  appSelector?: string
  entry?: string
}
const GET = 'GET'

const readHtmlTemplate = async (
  server: ViteDevServer,
  url: string,
  template: string = 'index.html',
) => {
  const filePath = path.resolve(server.config.root, template)
  return server.transformIndexHtml(url, await fs.promises.readFile(filePath, 'utf-8'))
}

export const readDefaultModule = async (server: ViteDevServer, modulePath: string) => {
  const filePath = path.join(server.config.root, modulePath)
  const module = await server.ssrLoadModule(filePath)
  return module.default ?? module
}

export const entryFromTemplate = (template: HTMLElement) => {
  return template.querySelector('body script[type=module]')?.getAttribute('src')
}

export const insertTags = (
  htmlElement: HTMLElement,
  selector: string,
  where: InsertPosition,
  tags?: string[],
) => {
  if (!tags) {
    return
  }
  const targetElement = htmlElement.querySelector(selector)
  if (targetElement) {
    tags.forEach((tag) => {
      targetElement.insertAdjacentHTML(where, tag)
    })
  }
}

export const insertTeleports = (htmlElement: HTMLElement, teleports?: Record<string, string>) => {
  if (!teleports) {
    return
  }
  Object.keys(teleports).forEach((key) => {
    const element = htmlElement.querySelector(key)
    if (element) {
      element.insertAdjacentHTML('afterbegin', teleports[key])
    }
  })
}

export const setHeaders = (res: http.ServerResponse, headers?: Headers) => {
  if (!headers) {
    return
  }
  Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]))
}

export const OK = 200

export const createHandler = (
  server: ViteDevServer,
  options: CreateHandlerOptions = {},
): Connect.NextHandleFunction => {
  const {
    entry: ssrEntry,
    appSelector = 'body #app',
  } = options
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
        throw new Error('Entry point for ssr not found')
      }
      const render = await readDefaultModule(server, entry)
      if (typeof render !== 'function') {
        return new Error('Entry point for ssr not found')
      }
      const context = {req, res, url}
      const {
        html: {
          app,
          afterApp,
          appendHead,
          prependHead,
          htmlAttrs,
          bodyAttrs,
          beforeApp,
          teleports,
        },
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
      if (bodyAttrs) {
        const bodyElement = htmlElement.querySelector('body')
        bodyElement?.setAttributes(bodyAttrs)
      }
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
