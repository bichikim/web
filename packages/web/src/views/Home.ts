import {setDeepName, setName, state} from '@/store'
import {Box, Flex} from '@winter-love/ui'
import {computed, defineComponent, h, ref} from 'vue'
import * as two from '@/two'

const foo = two.state({
  foo: 'foo',
  bar: 'bar',
})

two.subscribe(foo, () => console.log('yooh'))

const fooOne = two.compute(() => foo.foo + '1')

const changeBar = two.mutate((value: string) => (foo.bar = value))

two.subscribe(fooOne, (value) => console.log('fooOne', value))

two.subscribe(changeBar, (value) => console.log('changeBar', value))

export default defineComponent({
  name: 'home',
  setup() {
    const name = computed(() => (state.name))
    const deepName = computed(() => (state.deep.name))
    const range = ref('fit')
    const toggle = ref(false)
    const toggleRange = () => {
      if (range.value === 'fit') {
        range.value = 'space'
      } else {
        range.value = 'fit'
      }
    }

    const changeFoo = () => {
      if (toggle.value) {
        foo.foo = 'foo'
      } else {
        foo.foo = 'bar'
      }
      toggle.value = !toggle.value
    }

    const fooone = fooOne()

    const bar = computed(() => foo.bar)

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
          h(Box, {
            onClick: changeFoo,
          }, () => 'fooooooo'),
          h(Box, {
            onClick: () => changeBar(bar.value + '?'),
          }, () => 'baaar'),
          h(Box, () => fooone.value),
          h(Box, () => bar.value),
        ])
      )
    }
  },
})
