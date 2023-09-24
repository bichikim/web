import {MountingOptions, mount, VueWrapper} from '@vue/test-utils'
import {
  AllowedComponentProps,
  ComponentCustomProps,
  ComponentPublicInstance,
  defineComponent,
  SetupContext,
  UnwrapNestedRefs,
  VNodeProps,
} from 'vue'

export type PublicProps = VNodeProps & AllowedComponentProps & ComponentCustomProps
/**
 * @vue/test-utils/mount + setupState
 * @param setup
 * @param options
 */
export const mountComposition = <Props extends Record<string, any>, RawBindings = object>(
  setup: (props: Props, ctx: SetupContext) => RawBindings,
  options: MountingOptions<any> & {propsOptions?: any[]} = {},
): VueWrapper<ComponentPublicInstance<Props>> & {
  setupState: UnwrapNestedRefs<RawBindings>
} => {
  const {props = {}, propsOptions = []} = options
  const propKeys = [...Object.keys(props as any), ...propsOptions]
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
    options as any,
  ) as any

  const {setupState} = wrapper.vm.$ as any

  // eslint-disable-next-line prefer-object-spread
  return Object.assign(wrapper, {setupState})
}
