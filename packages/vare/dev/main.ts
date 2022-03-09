import {computed, createApp, defineComponent, h, ref} from 'vue'
import {createStore, createStoreDevTool, createVareStore} from '../src/store'

const useState = createStore('foo', () => {
  const foo = ref('foo')
  const decoFoo = computed(() => (`${foo.value}xx`))
  const increase = () => {
    foo.value += 1
  }

  return {
    decoFoo,
    foo,
    increase,
  }
})

const Component = defineComponent({
  setup() {
    const state = useState()
    return () => (
      h('div', [
        h('div', state.foo),
        h('div', state.decoFoo),
        h('button', {onClick: state.increase}, 'increase'),
      ])
    )
  },
})

const Root = defineComponent({
  setup() {
    return () => (
      h(Component)
    )
  },
})

const app = createApp(Root)

const vareStore = createVareStore()
app.use(vareStore)

app.mount('#app')

createStoreDevTool(app, vareStore.manager.storeTree)
