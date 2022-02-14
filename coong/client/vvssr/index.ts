import type {SSRContext} from '@vue/server-renderer'
import type {App, Component, ComponentPublicInstance, InjectionKey, UnwrapNestedRefs, Plugin} from 'vue'
import type {Data} from './types'
import {Serializer, createPlugin as createLuggagePlugin} from './luggage'
import {parseJson} from '@winter-love/utils'

const importServerSideModule = async () => {
  const {createSSRApp: createApp} = await import('vue')
  const {renderToString} = await import('@vue/server-renderer')

  const render = (input: App, context?: SSRContext): Promise<string> => {
    return renderToString(input, context)
  }

  return {
    createApp,
    render,
  }
}

const importClientSideModule = async () => {
  const {createApp} = await import('vue')

  const render = <HostElement = any>(
    input: App,
    rootContainer: string | HostElement,
  ): ComponentPublicInstance => {
    return input.mount(rootContainer)
  }

  return {
    createApp,
    render,
  }
}

export interface ServerSideOptions {
  serializer?: Serializer
}

export type FunctionPlugin = (app: App) => unknown

export const createViteClientSideApp = async (
  rootComponent: Component,
  rootProps?: Data,
) => {
  const {createApp, render: appRender} = await importClientSideModule()
  const app = createApp(rootComponent, rootProps)
  const data = parseJson(window.__LUGGAGE__, {})
  const {plugin: luggagePlugin, luggage} = createLuggagePlugin(data)
  app.use(luggagePlugin)

  const render = () => {
    return appRender(app, rootProps)
  }

  return {
    app,
    render,
  }
}

export const createViteServerSideApp = async (
  rootComponent: Component,
  context?: SSRContext,
) => {
  const {createApp, render: appRender} = await importServerSideModule()
  const app = createApp(rootComponent, context)
  const {plugin: luggagePlugin, luggage} = createLuggagePlugin({})
  app.use(luggagePlugin)

  const render = () => {
    const html = appRender(app, context)

  }

  return {
    app,
    render,
  }
}

export const createViteSSRApp = async () => {
  //empty
}

