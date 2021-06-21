import {styled} from 'src/emotion'
import {commons, systemProps, systems} from 'src/design-system/system'
import {createSystemConfig, system, SystemOptions} from '@winter-love/style-system'
import {cleanObject} from '@winter-love/utils'

export const containerProps = {
  ...systemProps,
}

export const Container = styled('div', {
  name: 'Container',
  props: {
    ...containerProps,
  },
})(
  systems,
)
