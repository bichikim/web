import {styled} from 'src/boot/emotion'
import {systems} from 'src/design-system/system'

export const Container = styled('div', {
  name: 'Container',
  props: {},
  stylePortal: 'css',
})(
  systems,
)
