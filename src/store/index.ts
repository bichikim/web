import {startDevtool} from 'vare'
import * as user from './user'
import {Plugin} from 'vue'

export {user}

const storePlugin: Plugin = (app) => {
  if (process.env.NODE_ENV === 'development') {
    startDevtool(app, {
      user: user.state,
    })
  }
}

export default storePlugin
