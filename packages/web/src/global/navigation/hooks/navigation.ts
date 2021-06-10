import {UnwrapNestedRefs} from '@vue/reactivity'
import {inject, provide, InjectionKey, reactive, computed} from 'vue'
import mitt, {Emitter} from 'mitt'

export interface ButtonContext {
  content?: any
  name: any
  color?: string
}

export interface ComfortableBarContext {
  show: boolean
  buttons: ButtonContext[]
}

export interface NavigationContext {
  comfortableBar: ComfortableBarContext,
  eventBus: Emitter
}

export const NavigationSym: InjectionKey<UnwrapNestedRefs<Readonly<NavigationContext>>> = Symbol('navigation-context')

export const provideNavigation = () => {
  const context = reactive<NavigationContext>({
    comfortableBar: {
      show: false,
      buttons: [
        {name: 'foo', content: 'foo'},
        {name: 'bar', content: 'bar'},
      ],
    },
    eventBus: mitt(),
  })

  provide(NavigationSym, context)

  return context
}

export const useNavigation = () => {
  const context = inject(NavigationSym, provideNavigation())

  const comfortableBarRef = computed(() => {
    return context.comfortableBar
  })

  const eventBus = context.eventBus

  return {
    eventBus,
    comfortableBarRef,
  }
}
