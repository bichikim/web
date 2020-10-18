import {defineComponent, h, computed, ref} from 'vue'
import {state, setName, setDeepName} from '@/store'
import {Box, Flex, Input} from '@innovirus/ui'

export default defineComponent({
  name: 'home',
  setup() {
    const name = computed(() => (state.name))
    const deepName = computed(() => (state.deep.name))
    const range = ref('fit')
    const toggleRange = () => {
      if (range.value === 'fit') {
        range.value = 'space'
      } else {
        range.value = 'fit'
      }
    }

    return () => {
      return (
        h('div', {}, [
          h(Flex, {}, () => [
            h(Box, {
              as: 'button',
              bg: 'Tomato',
              color: 'white',
              onclick: () => setName(name.value + 'A'),
            }, () => 'add A'),
            h(Box, {
              as: 'button',
              p: 10,
              onclick: () => setDeepName(deepName.value + 'D'),
            }, () => 'add deep D'),
            h(Box, {
              as: 'button',
              onClick: toggleRange,
            }, () => 'space'),
          ]),
          h(Box, {p: 10, bg: 'Tomato', color: 'white'}, () => 'foo'),
          // h(Input, {bg: 'Silver', color: 'white', value: 'foo'}),
          h(Flex, {p: 10, bg: 'WhiteSmoke', color: 'white', gap: 10}, () => [
            h(Box, {p: 10, range: 'space', bg: 'Silver', color: 'white'}, () => name.value),
            h(Box, {range: range.value, bg: 'Tomato', color: 'white', p: 10}, () => deepName.value),
          ]),
          h(Flex, {p: 10, bg: 'WhiteSmoke', color: 'white', gap: 10, width: 200}, () => [
            h(Box, {range: 'space', bg: 'Silver', color: 'white', p: 10}, () => name.value),
            h(Box, {range: range.value, bg: 'Silver', color: 'white', p: 10}, () => deepName.value),
          ]),
        ])
      )
    }
  },
})
