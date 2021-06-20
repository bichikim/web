import {commonProps, commons} from './commons'
import {compose} from '@winter-love/style-system'

export * from './commons'

export const systems = compose(commons)

export const systemProps = {
  ...commonProps,
}
