import {startDevtool} from './devtool'
import {Plugin} from 'vue-demi'
import {State} from './state'

export interface VarePlugin {
  states: Record<string, State<any>>
  /**
   * not recommended to use
   */
  vueGlobal?: boolean
}

/**
 * using this plugin is not mandatory
 * @param app
 * @param options
 */
export const plugin: Plugin = (app, options: VarePlugin) => {
  const {states, vueGlobal = false} = options
  if (process.env.NODE_ENV === 'development') {
    startDevtool(app, states)
  }

  if (vueGlobal) {
    app.config.globalProperties.$vare = states
  }
}
