import {mount} from '@vue/test-utils'
import {RenderFunction, SetupContext} from 'vue'
import {defineComponent} from 'vue-demi'

/**
 * @vue/test-utils/mount + setupState
 * @param setup
 */
export const mountComposition = <Props, RawBindings = object>(
  setup: (props: Readonly<Props>, ctx: SetupContext) => RawBindings | RenderFunction,
) => {
  const wrapper = mount(defineComponent<Props, RawBindings>(setup))

  return {
    ...wrapper,
    setupState: wrapper.vm.$.setupState,
  }
}
