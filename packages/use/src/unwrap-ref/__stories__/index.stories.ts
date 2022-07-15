import {unwrapRef} from '../'
import {h, ref} from 'vue-demi'

export const Default = () => ({
  setup() {
    const refValue = ref('foo')
    const refValueValue = unwrapRef(refValue)
    const noneRefValue = 'bar'
    const noneRefValueValue = unwrapRef(noneRefValue)

    return () => h('div', [h('div', refValueValue), h('div', noneRefValueValue)])
  },
})
