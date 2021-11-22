import {
  defineComponent,
  Directive,
  h,
  InjectionKey,
  provide,
  withDirectives,
} from 'vue'
import {useDirectiveProvide} from '../'
import {mount} from '@vue/test-utils'

describe('useContextInDirective', () => {
  it('should ', () => {

    const InjectKey: InjectionKey<any> = Symbol()

    const directive: Directive = {
      mounted(el, binding) {
        el.__foo__ = useDirectiveProvide(InjectKey, binding)
      },
    }

    const Component = defineComponent({
      setup() {
        return () => (
          withDirectives(h('div'), [[directive, 'foo']])
        )
      },
    })

    const Root = defineComponent({
      setup() {
        provide(InjectKey, 'foo')

        return () => (
          h(Component)
        )
      },
    })

    const wrapper = mount(Root)

    const Element: any = wrapper.get('div').element

    expect(Element.__foo__).toBe('foo')
  })
})
