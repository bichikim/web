import {h, ref} from 'vue-demi'
import {watchExtended} from '../'

export const Default = () => ({
  setup() {
    const fooRef = ref(0)
    const onceRef = ref(0)
    const debounceRef = ref(0)

    watchExtended(
      fooRef,
      (value) => {
        onceRef.value = value
      },
      {once: true},
    )

    watchExtended(
      fooRef,
      (value) => {
        debounceRef.value = value
      },
      {debounce: {interval: 1000}},
    )

    const increaseFoo = () => {
      fooRef.value += 1
    }

    return () =>
      h('div', [
        h('div', `foo ${fooRef.value}`),
        h('div', `onceRef ${onceRef.value}`),
        h('div', `debounceRef ${debounceRef.value}`),
        h('button', {onClick: increaseFoo}, 'increase foo'),
      ])
  },
})
