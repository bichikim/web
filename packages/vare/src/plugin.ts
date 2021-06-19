import {startDevtool} from './devtool'
import {Plugin, inject, InjectionKey} from 'vue-demi'
import {State} from './state'

export interface VarePlugin {
  /**
   * not recommended to use
   */
  provide?: boolean
  states: Record<string, State<any>>
}

const errorMessage = process.env.NODE_ENV === 'development' ?
  'Please use the Vare plugin with provide true. If you want to use the useVare' : ''

export interface UseVareReturnType {
  [key: string]: State<any>
}

const vareInjectKeySymbolName = process.env.NODE_ENV === 'development' ? 'vare-inject-key' : ''

export const vareInjectKey: InjectionKey<UseVareReturnType> = Symbol(vareInjectKeySymbolName)

/**
 * using this plugin is not mandatory
 * @param app
 * @param options
 */
export const plugin: Plugin = (app, options: VarePlugin) => {
  const {states, provide: isProvide = false} = options
  if (process.env.NODE_ENV === 'development') {
    startDevtool(app, states)
  }

  if (isProvide) {
    // app.config.globalProperties.$vare = states
    app.provide(vareInjectKey, states)
  }
}

export const useVare = (): UseVareReturnType => {
  const vare = inject(vareInjectKey)
  if (!vare) {
    throw new Error(errorMessage)
  }
  return vare
}
