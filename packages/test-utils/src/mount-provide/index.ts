/* eslint-disable vue/prefer-import-from-vue */
import {mount, MountingOptions, VueWrapper} from '@vue/test-utils'
import {
  ComponentPublicInstance,
  defineComponent,
  h,
  inject,
  InjectionKey,
  provide,
  Ref,
  ref,
  watch,
} from 'vue'

export type * from '@vue/shared'
export type {MountingOptions}

export type MountProvideOptions<
  Props extends Record<string, any>,
  InjectRawBindings,
  ProvideRawBindings,
> = MountingOptions<Props> & {
  inject: (props: Props) => InjectRawBindings
  provide: (props: Props) => ProvideRawBindings
} & {propsOptions?: any[]}

export const mountProvide = <
  Props extends Record<string, any>,
  InjectRawBindings,
  ProvideRawBindings,
>(
  options: MountProvideOptions<Props, InjectRawBindings, ProvideRawBindings>,
): VueWrapper<ComponentPublicInstance<Props>> & {
  setupState: {inject: InjectRawBindings; provide: ProvideRawBindings}
} => {
  const {
    inject: _inject,
    provide: _provide,
    propsOptions = [],
    props = {},
    ...rest
  } = options
  const KEY: InjectionKey<Ref<any>> = '__KEY_PROVIDE__' as any
  const propKeys = [...Object.keys(props as any), ...propsOptions]
  // eslint-disable-next-line vue/one-component-per-file
  const Component = defineComponent<Props>({
    props: propKeys as any,
    setup(props) {
      const injectReceiver: any = inject(KEY)
      const context: any = _inject(props)
      //
      watch(
        context,
        (value) => {
          injectReceiver.value = value
        },
        {
          flush: 'sync',
          immediate: true,
        },
      )
      return () => null
    },
  })
  // eslint-disable-next-line vue/one-component-per-file
  const Parent = defineComponent({
    props: propKeys as any,
    render() {
      return h(Component, {...(this.$props as any)})
    },
    setup(props) {
      const injectReceiver = ref(null)
      provide(KEY, injectReceiver)

      return {
        inject: injectReceiver,
        provide: _provide(props as any),
      }
    },
  })

  const wrapper = mount(Parent, {
    ...rest,
    props,
  } as any)

  const {setupState} = wrapper.vm.$ as any

  return Object.assign(wrapper, {setupState}) as any
}
