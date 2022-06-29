import {toObjectProps} from '../'
import {h} from 'vue-demi'

export const Default = () => ({
  setup() {
    const arrayResult = toObjectProps(['foo', 'bar'])
    const objectResult = toObjectProps({bar: null, foo: null})

    return () =>
      h('div', [
        h('div', `array to object options ${JSON.stringify(arrayResult)}`),
        h('div', `object to object options ${JSON.stringify(objectResult)}`),
      ])
  },
})
