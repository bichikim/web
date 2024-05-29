/// <reference types="@vue/shared" />

import {mount, MountingOptions, VueWrapper} from '@vue/test-utils'
import {
  ComponentPublicInstance,
  defineComponent,
  SetupContext,
  UnwrapNestedRefs,
} from 'vue'

// export type PublicProps = VNodeProps & AllowedComponentProps & ComponentCustomProps
/**
 * @vue/test-utils/mount + setupState
 * @param setup
 * @param options
 */
export const mountComposition = <Props extends Record<string, any>, RawBindings = object>(
  setup: (props: Props, context: SetupContext) => RawBindings,
  options: MountingOptions<any> & {propsOptions?: any[]} = {},
): any & {
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
      setup(props, context) {
        return setup(props, context)
      },
    }),
    options as any,
  ) as any

  const {setupState} = wrapper.vm.$ as any

  return Object.assign(wrapper, {setupState})
}

export {AllowedComponentProps, ComponentCustomProps, VNodeProps} from 'vue'
