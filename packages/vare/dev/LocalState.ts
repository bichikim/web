import {ref, h} from 'vue'
import {defineComponent} from 'vue-demi'
import {createStore} from 'src/store'
export interface List {
  id : string
  message: string
}
export const localState = createStore({
  local: true,
  name: 'local-state',
  setup() {
    let uid = 0
    const list = ref([] as List[])
    const addItem = (message: string) => {
      list.value.push({
        id: String(uid += 1),
        message,
      })
    }
    return {
      addItem,
      list,
    }
  },
})

export const LocalState = defineComponent({
  name: 'LocalState',
  setup() {
    const state = localState()
    const addMessage = () => {
      state.addItem('offff')
    }
    return () => (
      h('div', [
        h('button', {onClick: addMessage}, 'add'),
        state.list.map((item) => {
          return (
            h('div', {key: item.id}, item.message)
          )
        }),
      ])
    )
  },
})
