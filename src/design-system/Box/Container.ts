import {SystemProps, systems} from 'src/design-system/system'
import {styled} from 'src/emotion'
import {PropType} from 'vue'

export const containerProps = {
  css: {default: () => ({}), type: Object as PropType<SystemProps>},
}

export const Container = styled('div', {
  name: 'Container',
  props: {
    ...containerProps,
  },
  stylePortal: 'css',
})(
  systems,
)
