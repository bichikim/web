import {PureObject} from '@winter-love/utils'
import {StyleOptions} from './system'

export const createSystemConfig = <Theme extends PureObject>(config: StyleOptions<Theme>) =>
  (configNext: StyleOptions<Theme> = {}) => {
    return {
      ...config,
      ...configNext,
    }
  }
