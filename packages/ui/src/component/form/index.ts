import {createBox} from '@/component'
import {defineComponent, h, ref, provide, inject} from 'vue'

const Container = createBox({
  as: 'form',
})

const ContextSym = Symbol('from-context')

export const useForm = () => {
  return inject(ContextSym)
}

type TouchedItems = Record<string, boolean>
type Values = Record<string, any>
type Errors = Record<string, any>

interface FromContext {
  values: Values
  errors: Errors
}

/**
 * Todo WIP
 */
export const Form = defineComponent({
  name: 'b-form',
  props: {
    value: null,
  },
  emits: {
    input: null,
  },
  setup(props, {attrs, emit, slots}) {
    const touchedItems = ref<TouchedItems>({})
    const values = ref<Values>({})
    const errors = ref<Errors>({})

    provide(ContextSym, {values: values.value, errors: errors.value})

    return () => {
      return h(Container, {},
        slots,
      )
    }
  },
})
