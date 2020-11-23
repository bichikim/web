import {createBox} from '@/component'
import {defineComponent, h, ref, provide, inject, computed} from 'vue'

const Container = createBox({
  as: 'form',
})

export interface FormContext<S = any> {
  values: Record<string, any>
  errors: Record<string, any>
  onChange: (value: S) => any
}

export interface UseNamedFromReturnType<S = any> {
  onChange: (value: S) => any
  value: S
  errors?: boolean | string
}

type TouchedItems = Record<string, boolean>
type Values = Record<string, any>
type Errors = Record<string, any>

export interface FromContext {
  values: Values
  errors: Errors
}

const ContextSym = Symbol('from-context')

export const useForm = (): FormContext | undefined => {
  return inject<FormContext>(ContextSym)
}

export const useNamedForm = (name: string) => {
  const form = useForm()

  if (!form) {
    return {}
  }

  const nameRef = ref(name)

  return {
    onChange: (value) => form.onChange({[nameRef.value]: value}),
    error: computed(() => form.values[nameRef.value]),
    value: computed(() => form.errors[nameRef.value]),
  }
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
    const values = ref<Values>({})
    const errors = ref<Errors>({})

    const onChange = (value: Record<string, any>) => {
      values.value = {
        ...values.value,
        ...value,
      }
    }

    provide<FormContext>(ContextSym, {values: values.value, errors: errors.value, onChange})

    return () => {
      return h(Container, {},
        slots,
      )
    }
  },
})
