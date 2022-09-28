import {bindDeep, MaybeRef, resolveRef} from '@winter-love/use'
import {uid} from '@winter-love/utils'
import {
  ComponentPublicInstance,
  computed,
  inject,
  InjectionKey,
  onScopeDispose,
  provide,
  reactive,
  ref,
} from 'vue'

export interface ControlDialogContext {
  isOpen: boolean
  open: (value: boolean) => any
  toggle: () => any
}

export const CONTROL_DIALOG_SYMBOL = Symbol('control-dialog')
export const CONTROL_DIALOG_CONTEXT: InjectionKey<ControlDialogContext> = CONTROL_DIALOG_SYMBOL
export const DIALOG_SYMBOL = Symbol('dialog')
export const DIALOG_CONTEXT: InjectionKey<DialogGlobalContext> = DIALOG_SYMBOL

export interface DialogContext extends ControlDialogContext {
  element: HTMLElement | null
  id: Readonly<string>
  message?: string
  props: Record<string, any>
}

export interface DialogGlobalContext {
  dialogs: Record<string, DialogState>
  dispose: (id: string) => any
  init: (id: string) => any
}

export interface DialogState {
  element?: HTMLElement | ComponentPublicInstance
  isOpen: boolean
  props?: Record<string, any>
}

export const createGlobalDialogContext = (): DialogGlobalContext => {
  const dialogs = ref<Record<string, DialogState>>({})

  const dispose = (id: string) => {
    delete dialogs.value[id]
  }

  const init = (id: string) => {
    dialogs.value[id] = {isOpen: false}
  }

  return reactive({
    dialogs,
    dispose,
    init,
  })
}

export const provideGlobalDialog = (key?: string | symbol): DialogGlobalContext => {
  const context = createGlobalDialogContext()
  provide(key ?? DIALOG_CONTEXT, context)
  return context
}

export const useLocalDialog = (
  id: MaybeRef<string>,
  key?: string | symbol,
): [DialogContext, DialogGlobalContext] => {
  const idRef = resolveRef(id)

  const context = inject(key ?? DIALOG_CONTEXT, () => createGlobalDialogContext(), true)

  const itemRef = computed(() => {
    return context.dialogs[idRef.value]
  })

  const message = bindDeep(itemRef, ['message'])

  const isOpen = bindDeep(itemRef, ['isOpen'])

  const element = bindDeep(itemRef, ['element'])

  const props = bindDeep(itemRef, ['props'])

  const open = (value: boolean) => {
    isOpen.value = value
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return [
    reactive({
      element,
      id,
      isOpen,
      message,
      open,
      props,
      toggle,
    }),
    context,
  ]
}

export const useDialog = (key?: string | symbol): DialogContext => {
  const id = uid()

  const [localContext, context] = useLocalDialog(id, key)
  context.init(id)

  onScopeDispose(() => {
    context.dispose(id)
  })

  return localContext
}

export const provideControlDialog = (props: ControlDialogContext) => {
  provide(CONTROL_DIALOG_CONTEXT, props)
}

export const useControlDialog = () => {
  return inject(CONTROL_DIALOG_CONTEXT)
}
