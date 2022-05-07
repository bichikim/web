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
  ref,
  Ref,
  VNode,
} from 'vue-demi'
import {AnyFunction} from '@winter-love/utils'
import {debounce} from '@winter-love/lodash'

export interface VerifyInputs {
  errorMessage: undefined | string | boolean
  isValid: boolean
  registerInput: (el: any, value: ContextObjectValue) => void
  unRegisterInput: (el: any) => void
}

export const VerifyInputsKey: InjectionKey<VerifyInputs> = Symbol('verifyInputs')

export interface ContextObjectValue {
  atChanged?: boolean
  atUpdated?: boolean
  debounce?: number
  /**
   * return true or string means it is an error value
   */
  validation: Validation
}

export interface ObjectValue extends ContextObjectValue {
  getInput?: (el: any, vnode: VNode) => HTMLInputElement
}

const getHandel = (handel: AnyFunction, wait?: number) => {
  if (!wait) {
    return handel
  }
  return debounce(handel, wait)
}

const DEFAULT_DEBOUNCE_WAIT = 250
const createContext = (): VerifyInputs => {
  const inputs = ref<Map<any, boolean | string>>(new Map())
  const handles = ref<Map<any, AnyFunction>>(new Map())

  const inputsRef = computed(() => {
    const inputs_ = inputs.value
    return [...inputs_.entries()]
  })

  const errorItem = computed(() => {
    const inputs = inputsRef.value
    return inputs.find(([_, value]) => value)
  })

  const isValid = computed(() => {
    return !(errorItem.value)
  })

  const errorMessage = computed(() => {
    const error = errorItem.value
    if (error) {
      return error[1]
    }
  })

  const registerInput = (el: any, value: ContextObjectValue) => {
    unRegisterInput(el)
    if (el instanceof HTMLInputElement) {
      const {
        validation,
        atUpdated = true,
        atChanged = false,
        debounce: debounceWait = DEFAULT_DEBOUNCE_WAIT,
      } = value
      inputs.value.set(el, false)
      const handle = getHandel((event) => {
        const value = event.target?.value
        const result = validation(value)
        inputs.value.set(el, result)
      }, debounceWait)
      if (atUpdated) {
        el.addEventListener('input', handle)
      }
      if (atChanged) {
        el.addEventListener('change', handle)
      }
      handles.value.set(el, handle)
    }
  }

  const unRegisterInput = (el: any) => {
    inputs.value.delete(el)
    const handle = handles.value.get(el)
    if (handle) {
      (el as HTMLInputElement).removeEventListener('input', handle);
      (el as HTMLInputElement).removeEventListener('change', handle)
    }
    handles.value.delete(el)
  }

  return reactive({
    errorMessage,
    isValid,
    registerInput,
    unRegisterInput,
  })
}

export const useVerifyInputs = () => {
  const context = createContext()
  provide(VerifyInputsKey, context)
  return context
}

export const useVerifyInput = (ref: Ref<any>, value: ObjectValue | Validation) => {
  const context = inject(VerifyInputsKey)

  if (process.env.NODE_ENV === 'development' && !context) {
    console.warn('use useVerifyInput after provide context by the useVerifyInputs')
  }

  const context_ = context ?? createContext()
  const objectValue = getObjectValue(value)

  onMounted(() => {
    if (!objectValue) {
      return
    }
    context_.registerInput(ref.value, objectValue)
  })

  onScopeDispose(() => {
    context_.unRegisterInput(ref.value)
  })

  return context_
}

const getContext = (binding: DirectiveBinding<any>): undefined | VerifyInputs => {
  const {instance} = binding
  const innerInstance: any = instance?.$
  const {provides = {}} = innerInstance ?? {}
  return provides[VerifyInputsKey as any]
}

const getObjectValue = (value: ObjectValue | Validation): ObjectValue | undefined => {
  if (typeof value === 'function') {
    return {
      validation: value,
    }
  }
  if (typeof value === 'object') {
    const {validation} = value
    if (typeof validation === 'function') {
      return value
    }
  }
}

const getValue = (binding: DirectiveBinding<any>): ObjectValue | undefined => {
  const {value} = binding
  return getObjectValue(value)
}

const getElement = (el: any, value: ObjectValue, vnode: VNode): any => {
  if (typeof value.getInput === 'function') {
    return value.getInput(el, vnode)
  }
  return el
}

export type Validation = (value: string) => boolean | string

const updateValidation = (el: any, binding: DirectiveBinding, vnode: VNode) => {
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

  const element = getElement(el, value, vnode)

  verifyInputs.registerInput(element, value)
}

export const verifyDirective: ObjectDirective = {
  beforeMount: updateValidation,
  beforeUnmount(el: any, binding, vnode) {
    const verifyInputs = getContext(binding as any)
    if (!verifyInputs) {
      return
    }

    const value = getValue(binding)
    if (!value) {
      return
    }

    const element = getElement(el, value, vnode)

    verifyInputs.unRegisterInput(element)
  },
}
