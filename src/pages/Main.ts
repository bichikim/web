import {user} from 'src/store'
import {useAppClipboard} from 'src/use'
import {computed, defineComponent, h, ref} from 'vue'
import {useRouter} from 'vue-router'
import Style from 'src/design-system/Style.vue'

export const Main = defineComponent({
  name: 'Main',
  setup() {
    const valueRef = ref('')
    const inputRef = ref('')
    const router = useRouter()
    const {write, read, state} = useAppClipboard(valueRef)

    const updateName = user.updateUserName.act
    const name = computed(() => {
      return user.state.value.name
    })

    const readAndUpdateInput = async () => {
      const value = await read()
      if (value) {
        inputRef.value = value
      }
    }

    return () => (
      h('div', {style: {paddingTop: '100px'}}, [
        h('div', state.value),
        h('div', valueRef.value),
        h('div', inputRef.value),
        h('input', {onInput: (event) => (inputRef.value = event.target.value), value: inputRef.value}),
        h('button', {onClick: () => write(inputRef.value)}, 'write'),
        h('button', {onClick: () => readAndUpdateInput()}, 'read'),
        h('button', {onClick: () => updateName('bar')}, 'update name'),
        h('button', {onClick: () => (router.push('test'))}, 'go test1'),
        h('div', name.value),
        h(Style, {css: {color: 'red'}}, () => [
          'style',
          h(Style, {css: {bg: ['blue', 'green'], color: 'white'}}, () => [
            'style',
          ]),
        ]),
      ])
    )
  },
})

export default Main
