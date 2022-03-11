import {computed, createApp, defineComponent, h, ref} from 'vue'
import {createStore, createStoreDevTool, createVareStore} from '../src/store'

const useFoo = createStore('foo', () => {
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

const useBar = createStore('bar', () => {
  const name = ref('foo')
  const decoFoo = computed(() => (`${name.value}xx`))
  const increase = () => {
    name.value += 1
  }
  return {
    decoFoo,
    increase,
    name,
  }
})

const Component = defineComponent({
  setup() {
    const foo = useFoo()
    const bar = useBar()
    return () => (
      h('div', [
        h('div', foo.foo),
        h('div', foo.decoFoo),
        h('button', {onClick: foo.increase}, 'foo increase'),
        h('div', bar.name),
        h('div', bar.decoFoo),
        h('button', {onClick: bar.increase}, 'bar increase'),
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
