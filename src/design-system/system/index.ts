import {commons, commonProps} from './commons'
import {compose} from '@winter-love/style-system'

export const systems = compose(commons)

export const systemProps = {
  ...commonProps,
}
