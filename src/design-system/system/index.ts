import {commonProps, commons} from './commons'
import {compose} from '@winter-love/style-system'
import {deepMemoize} from '@winter-love/utils'

export * from './commons'

export const systems = deepMemoize({
  maxSize: 1000,
})(compose(commons))

export const systemProps = {
  ...commonProps,
}
