import {inject, InjectionKey, Plugin} from 'vue-demi'
import {State} from './state'

export type States = Record<string, State<any>>

export type FunctionStates = (initState: Partial<States>) => States

export interface VarePlugin {
  /**
   * not recommended to use
   */
  provide?: boolean
  states: States | FunctionStates
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
    // startDevtool(app, states)
  }

  if (isProvide) {
    app.provide(vareInjectKey, states)
  }
}

/**
 * we do not recommend to use this
 */
export const useVare = (): UseVareReturnType => {
  const vare = inject(vareInjectKey)
  if (!vare) {
    throw new Error(errorMessage)
  }
  return vare
}
