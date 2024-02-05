/* eslint-disable max-classes-per-file */
import {App, Component, ComponentPublicInstance, createApp, createSSRApp} from 'vue'
import {renderToString} from '@vue/server-renderer'
import {Data, Headers, SSRContext} from './types'
import {isServerRendered} from './is-server-rendered'

const serverSideRender = (input: App, context?: SSRContext): Promise<string> => {
  return renderToString(input, context)
}

const importServerSideModule = async () => {
  return {
    createApp: createSSRApp,
    render: serverSideRender,
  }
}

const clientSideRender = <HostElement = any>(
  input: App,
  rootContainer: string | HostElement,
  isHydrate?: boolean,
  isSVG: boolean = true,
): ComponentPublicInstance => {
  return input.mount(rootContainer, isHydrate, isSVG)
}

const importClientSideModule = async () => {
  return {
    createApp,
    createSSRApp,
    render: clientSideRender,
  }
}

export interface SharedSideOptions {
  luggageKey?: string
}

export interface SSRHtmlResult {
  afterApp?: string[]
  app: string
  appendHead?: string[]
  beforeApp?: string[]
  bodyAttrs?: Record<string, string>
  htmlAttrs?: Record<string, string>
  prependHead?: string[]
  teleports?: Record<string, string>
}

export interface SSRResponseResult {
  headers?: Headers
  status?: number
}

export interface SSRResult {
  html: SSRHtmlResult
  response?: SSRResponseResult
}

export interface ClientSideOptions extends SharedSideOptions {
  __foo: never
}

const SERVER_RENDERED_KEY = 'data-server-rendered'

export const createViteClientSideApp = async (
  rootComponent: Component,
  rootProps: Data = {},
) => {
  const {createApp, createSSRApp, render: appRender} = await importClientSideModule()
  let app
  const serverRendered = isServerRendered()
  if (serverRendered) {
    app = createSSRApp(rootComponent, rootProps)
  } else {
    app = createApp(rootComponent, rootProps)
  }

  const render = (rootContainer: string, _app: App = app) => {
    return appRender(_app, rootContainer, serverRendered)
  }

  return {
    app,
    render,
  }
}

export type AfterRender<T extends Record<string, any>> = (
  factoryResponse: T,
) => any | Promise<any>

export const createViteServerSideApp = async (
  rootComponent: Component,
  rootProps: Data = {},
) => {
  const {createApp, render: appRender} = await importServerSideModule()
  const app = createApp(rootComponent, rootProps)

  const render = async (context: SSRContext, _app: App = app): Promise<SSRHtmlResult> => {
    return {
      app: await appRender(_app, context),
      teleports: context.teleports ?? {},
    }
  }

  return {
    app,
    render,
  }
}

export type Render = <T>(
  arg: T,
  app?: App,
) => T extends infer P ? (P extends string ? void : Promise<SSRHtmlResult>) : any

export interface FactoryArg {
  app: App
  context?: SSRContext
  render: Render
  rootProps?: Data
}

export type AppFactory = (arg: FactoryArg) => SSRResult | void | Promise<SSRResult | void>

export class RenderError extends Error {
  type: string = 'render error'
}

export class ContextError extends Error {
  type: string = 'context error'
}

const isSSRContext = (context?: SSRContext | Data): context is SSRContext => {
  if (!context) {
    return false
  }
  const {req, res, url} = context
  return Boolean(req && res && url)
}

export interface RenderArg {
  context?: SSRContext
  rootProps?: Data
}

export const rendererServerApp = async (
  rootComponent: Component,
  factory: AppFactory,
  arg: RenderArg,
) => {
  const {context, rootProps} = arg
  if (!isSSRContext(context)) {
    throw new ContextError('Context should have res and req')
  }
  const {app, render} = await createViteServerSideApp(rootComponent, rootProps)
  const result = await factory({app, context, render: render as any})
  if (!result) {
    throw new RenderError('empty ssr render result')
  }
  return {
    ...result,
    html: {
      ...result.html,
      bodyAttrs: {
        ...result.html.bodyAttrs,
        [SERVER_RENDERED_KEY]: '',
      },
    },
  }
}

export const rendererClientApp = async (
  rootComponent: Component,
  factory: AppFactory,
  arg: RenderArg,
) => {
  const {rootProps} = arg
  const {app, render} = await createViteClientSideApp(rootComponent, rootProps)
  return factory({app, render: render as any, rootProps})
}

export const createRenderApp = (rootComponent: Component, factory: AppFactory) => {
  return async (arg: RenderArg = {}): Promise<SSRResult | void> => {
    if (import.meta.env.SSR) {
      return rendererServerApp(rootComponent, factory, arg)
    }
    return rendererClientApp(rootComponent, factory, arg)
  }
}
