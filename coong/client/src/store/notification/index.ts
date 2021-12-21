import {notification} from './state'
import {setCount} from './set-count'
import {getDouble} from './get-double-count'
import {getMultiplyCount} from './get-multiply-count'

export default {
  getDouble,
  getMultiplyCount,
  setCount,
  state: notification,
}
