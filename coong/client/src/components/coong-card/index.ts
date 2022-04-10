import {HCard} from '@winter-love/hyper-components'
import {defineComponent, h} from 'vue'

export const CoongCard = defineComponent({
  name: 'CoongCard',
  setup() {
    return () => (
      h(HCard, {}, () => [
        'hello',
      ])
    )
  },
})
