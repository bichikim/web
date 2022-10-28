import {defineComponent, h} from 'vue'
import {HCardIndicator} from './HCardIndecator'

export const HCard = defineComponent({
  name: 'HCard',
  setup(_, {slots}) {
    return () =>
      h('div', {class: 'root'}, [
        h(HCardIndicator, {class: 'indicator'}),
        h('div', {class: 'content'}, slots.default?.()),
      ])
  },
})
