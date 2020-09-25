import {defineComponent, h, computed, ref} from 'vue'
import {state, setName, setDeepName} from '@/store'
import {Box, Flex, Input} from '@/ui'

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
          h('div', [
            h('span', 'name'),
            h('span', name.value),
          ]),
          h('div', [
            h('span', 'deep name'),
            h('span', deepName.value),
          ]),
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
          h(Box, {p: 10, bg: 'tomato', color: 'white'}, () => 'foo'),
          h(Input, {bg: 'Silver', color: 'white'}),
          h(Flex, {p: 10, bg: 'WhiteSmoke', color: 'white', gap: 10}, () => [
            h(Box, {range: 'space', bg: 'Silver'}, () => name.value),
            h(Box, {range: range.value, bg: 'Silver'}, () => deepName.value),
          ]),
          h(Flex, {p: 10, bg: 'WhiteSmoke', color: 'white', gap: 10, width: 200}, () => [
            h(Box, {range: 'space', bg: 'Silver'}, () => name.value),
            h(Box, {range: range.value, bg: 'Silver'}, () => deepName.value),
          ]),
        ])
      )
    }
  },
})
