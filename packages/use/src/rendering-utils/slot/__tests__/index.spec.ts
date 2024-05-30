/**
 * @jest-environment jsdom
 */
import {slot} from '../'
import {defineComponent, h, mount} from '@winter-love/test-utils'
import {describe, it, expect} from 'vitest'

describe('Slot', () => {
  const setup = () => {
    const Component = defineComponent({
      setup(_, {slots}) {
        return () =>
          h('div', [
            //
            slot('foo', slots, {slotDefault: 'default slot'}),
          ])
      },
    })
    const Root = defineComponent({
      setup() {
        return () =>
          h('div', [
            //
            h(
              Component,
              {},
              {
                foo: () => 'foo',
              },
            ),
          ])
      },
    })
    const wrapper = mount(Root)

    return {wrapper}
  }
  it('should render default slot content', () => {
    const {wrapper} = setup()
    expect(wrapper.text()).toBe('foo')
  })
})
