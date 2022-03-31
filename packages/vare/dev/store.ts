import {createStore} from 'src/store'
import {computed, ref, toRefs, watch} from 'vue'

export const useFoo = createStore('foo', () => {
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

export const useBar = createStore('bar', () => {
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

export const usePropsState = createStore({
  name: 'props-state',
  props: {
    name: {type: String},
  },
  setup(props) {
    const {name} = toRefs(props)
    const nameRef = ref(name?.value ?? '')
    const age = ref(0)
    watch(name as any, (value: any, oldValue) => {
      if (value && value !== oldValue) {
        nameRef.value = value
      }
    })
    const increaseAge = () => {
      age.value += 1
    }
    return {
      age,
      increaseAge,
      name: nameRef,
    }
  },
})
