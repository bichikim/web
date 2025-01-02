import {
  computed,
  DirectiveBinding,
  inject,
  InjectionKey,
  ObjectDirective,
  onMounted,
  onScopeDispose,
  provide,
  reactive,
  Ref,
  ref,
  toRefs,
  VNode,
} from 'vue'
import {AnyFunction} from '@winter-love/utils'
import {debounce, first} from '@winter-love/lodash'

export interface VerifyInputs {
  errorItems: [any, undefined | string | boolean][]
  errorMessage: undefined | string | boolean
  isValid: boolean
  registerInput: (element: any, value: ContextObjectValue) => void
  unRegisterInput: (element: any) => void
  verify: () => void
}

export interface VerifyInput {
  errorMessage: undefined | string | boolean
  verify: () => void
}

export const VerifyInputsKey: InjectionKey<VerifyInputs> = Symbol('verifyInputs')

export interface ContextObjectValue {
  debounce?: number
  validateAt?: 'input' | 'change'
  /**
   * return true or string means it is an error value
   */
  validator: Validator
}

export interface ObjectValue extends ContextObjectValue {
  getInput?: (element: any, vnode: VNode) => HTMLInputElement
}

const getHandel = (handel: AnyFunction, wait?: number) => {
  if (!wait) {
    return handel
  }

  return debounce(handel, wait)
}

const triggerChange = (element: any, type: 'input' | 'change' = 'input') => {
  if (element instanceof HTMLInputElement) {
    const event = new Event(type)

    element.dispatchEvent(event)
  }
}
const DEFAULT_DEBOUNCE_WAIT = 250
const createContext = (): VerifyInputs => {
  const inputs = ref<Map<any, boolean | string>>(new Map())
  const handles = ref<Map<any, AnyFunction>>(new Map())
  const inputContexts = new WeakMap<any, ContextObjectValue>()
  const inputsRef = computed(() => {
    const _inputs = inputs.value

    return [..._inputs.entries()]
  })
  const errorItems = computed(() => {
    const inputs = inputsRef.value

    return inputs.filter(([_, value]) => value)
  })
  const isValid = computed(() => {
    return !first(errorItems.value)
  })
  // eslint-disable-next-line vue/return-in-computed-property
  const errorMessage = computed(() => {
    const error = first(errorItems.value)

    if (error) {
      return error[1]
    }
  })
  const registerInput = (element: any, value: ContextObjectValue) => {
    unRegisterInput(element)

    if (element instanceof HTMLInputElement) {
      const {
        validator,
        validateAt = 'input',
        debounce: debounceWait = DEFAULT_DEBOUNCE_WAIT,
      } = value

      inputContexts.set(element, value)
      inputs.value.set(element, false)
      const handle = getHandel((event) => {
        const value = event.target?.value
        const result = validator(value)

        inputs.value.set(element, result)
      }, debounceWait)

      if (validateAt === 'input') {
        element.addEventListener('input', handle)
      } else {
        element.addEventListener('change', handle)
      }

      handles.value.set(element, handle)
    }
  }

  const verify = () => {
    const allElements = inputsRef.value.map(([element]) => element)

    for (const element of allElements) {
      const validateAt = inputContexts.get(element)?.validateAt

      triggerChange(element, validateAt)
    }
  }

  const unRegisterInput = (element: any) => {
    inputs.value.delete(element)
    inputContexts.delete(element)
    const handle = handles.value.get(element)

    if (handle) {
      ;(element as HTMLInputElement).removeEventListener('input', handle)
      ;(element as HTMLInputElement).removeEventListener('change', handle)
    }

    handles.value.delete(element)
  }

  return reactive({
    errorItems,
    errorMessage,
    isValid,
    registerInput,
    unRegisterInput,
    verify,
  })
}

export const useVerifyInputs = () => {
  const context = createContext()

  provide(VerifyInputsKey, context)

  return context
}

export const useVerifyInput = (
  ref: Ref<any>,
  value: ObjectValue | Validator,
): VerifyInput => {
  const context = inject(VerifyInputsKey)

  if (process.env.NODE_ENV === 'development' && !context) {
    console.warn('use useVerifyInput after provide context by the useVerifyInputs')
  }

  const _context = context ?? createContext()
  const {errorItems} = toRefs(_context)
  const objectValue = getObjectValue(value)

  onMounted(() => {
    if (!objectValue) {
      return
    }

    _context.registerInput(ref.value, objectValue)
  })

  onScopeDispose(() => {
    _context.unRegisterInput(ref.value)
  })

  // eslint-disable-next-line vue/return-in-computed-property
  const errorMessage = computed(() => {
    const result = errorItems.value.find(([key]) => key === ref.value)

    if (result) {
      return result[1]
    }
  })
  const verify = () => {
    const element = ref.value

    triggerChange(element, objectValue?.validateAt)
  }

  return reactive({
    errorMessage,
    verify,
  })
}

const getContext = (binding: DirectiveBinding<any>): undefined | VerifyInputs => {
  const {instance} = binding
  const innerInstance: any = instance?.$
  const {provides = {}} = innerInstance ?? {}

  return provides[VerifyInputsKey as any]
}

const getObjectValue = (value: ObjectValue | Validator): ObjectValue | undefined => {
  if (typeof value === 'function') {
    return {
      validator: value,
    }
  }

  if (typeof value === 'object') {
    const {validator} = value

    if (typeof validator === 'function') {
      return value
    }
  }
}

const getValue = (binding: DirectiveBinding<any>): ObjectValue | undefined => {
  const {value} = binding

  return getObjectValue(value)
}

const getElement = (element: any, value: ObjectValue, vnode: VNode): any => {
  if (typeof value.getInput === 'function') {
    return value.getInput(element, vnode)
  }

  return element
}

export type Validator = (value: string) => boolean | string

const updateValidation = (element_: any, binding: DirectiveBinding, vnode: VNode) => {
  const verifyInputs = getContext(binding)

  if (!verifyInputs) {
    return
  }

  const value = getValue(binding)

  if (!value) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`${binding.value} is not supported`)
    }

    return
  }

  const element = getElement(element_, value, vnode)

  verifyInputs.registerInput(element, value)
}

export const verifyDirective: ObjectDirective = {
  beforeMount: updateValidation,
  beforeUnmount(element_: any, binding, vnode) {
    const verifyInputs = getContext(binding as any)

    if (!verifyInputs) {
      return
    }

    const value = getValue(binding)

    if (!value) {
      return
    }

    const element = getElement(element_, value, vnode)

    verifyInputs.unRegisterInput(element)
  },
}
