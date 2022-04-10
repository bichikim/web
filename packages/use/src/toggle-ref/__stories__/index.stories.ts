import {toggleRef} from '../'
import {h} from 'vue-demi'

export const Default = () => ({
  setup() {
    const {value, toggle} = toggleRef(false)
    return () => (
      h('div', [
        h('div', `value ${value.value}`),
        h('button', {onClick: toggle}, 'toggle value'),
      ])
    )
  },
})
