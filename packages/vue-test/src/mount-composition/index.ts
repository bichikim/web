import {mount, MountingOptions, VueWrapper} from '@vue/test-utils'
import {
  AllowedComponentProps,
  ComponentCustomProps,
  ComponentPublicInstance,
  DefineComponent,
  defineComponent,
  ExtractDefaultPropTypes,
  ExtractPropTypes,
  SetupContext,
  UnwrapNestedRefs,
  VNodeProps,
} from 'vue'

export type PublicProps = VNodeProps & AllowedComponentProps & ComponentCustomProps
export type ComponentMountingOptions<T> = T extends DefineComponent<
  infer PropsOrPropOptions,
  any,
  infer D,
  any,
  any
>
  ? MountingOptions<
      Partial<ExtractDefaultPropTypes<PropsOrPropOptions>> &
        Omit<
          Readonly<ExtractPropTypes<PropsOrPropOptions>> & PublicProps,
          keyof ExtractDefaultPropTypes<PropsOrPropOptions>
        >,
      D
    > &
      Record<string, any>
  : MountingOptions<any>

/**
 * @vue/test-utils/mount + setupState
 * @param setup
 * @param options
 */
export const mountComposition = <Props extends Record<string, any>, RawBindings = object>(
  setup: (props: Props, ctx: SetupContext) => RawBindings,
  options: ComponentMountingOptions<any> & {propsOptions?: any[]} = {},
): VueWrapper<ComponentPublicInstance<Props>> & {setupState: UnwrapNestedRefs<RawBindings>} => {
  const {props = {}, propsOptions = []} = options
  const propKeys = [...Object.keys(props), ...propsOptions]
  const wrapper: VueWrapper<ComponentPublicInstance<Props>> = mount(
    defineComponent({
      props: propKeys,
      render() {
        return null
      },
      setup(props, ctx) {
        return setup(props, ctx)
      },
    }),
    options,
  ) as any

  const {setupState} = wrapper.vm.$ as any

  // eslint-disable-next-line prefer-object-spread
  return Object.assign(wrapper, {setupState})
}
