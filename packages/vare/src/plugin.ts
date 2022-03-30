import {inject, InjectionKey, Plugin} from 'vue-demi'
import {createDevTool} from './create-devtool'
/**
 * @deprecated
 */
export type States = Record<string, any>
/**
 * @deprecated
 */
export type FunctionStates = (initState: Partial<States>) => States
/**
 * @deprecated
 */
export interface VarePlugin {
  /**
   * not recommended to use
   */
  readonly provide?: boolean
  readonly states: States | FunctionStates
}

const errorMessage = process.env.NODE_ENV === 'development' ?
  'Please use the Vare plugin with provide true. If you want to use the useVare' : ''

export interface UseVareReturnType {
  [key: string]: any
}

const vareInjectKeySymbolName = process.env.NODE_ENV === 'development' ? 'vare-inject-key' : ''

/**
 * @deprecated
 */
export const vareInjectKey: InjectionKey<UseVareReturnType> = Symbol(vareInjectKeySymbolName)

/**
 * @deprecated
 * @param app
 * @param options
 */
export const plugin: Plugin = (app, options: VarePlugin) => {
  const {states, provide: isProvide = false} = options
  if (process.env.NODE_ENV === 'development') {
    createDevTool(app, states)
  }

  if (isProvide) {
    app.provide(vareInjectKey, states)
  }
}

/**
 * @deprecated
 * we do not recommend to use this
 */
export const useVare = (): UseVareReturnType => {
  const vare = inject(vareInjectKey)
  if (!vare) {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(errorMessage)
  }
  return vare
}
