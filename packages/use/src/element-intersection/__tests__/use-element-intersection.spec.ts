import {defineComponent, h, ref} from 'vue-demi'
import {flushPromises, mount} from '@vue/test-utils'
import {onElementIntersection} from 'src/element-intersection/on-element-intersection'
import {useElementIntersection} from 'src/element-intersection'
jest.mock('../on-element-intersection', () => ({
  onElementIntersection: jest.fn(),
}))

const mockOnElementIntersection: jest.Mock = onElementIntersection as any
const threshold = 0.05
const TestComponent = defineComponent({
  setup(props, {slots}) {
    const elementRef = ref()
    const showRef = useElementIntersection(elementRef, {
      threshold,
    })

    return () =>
      h(
        'div',
        {
          ref: elementRef,
          style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
        },
        showRef.value ? slots.default?.() : undefined,
      )
  },
})

describe('use-element-intersection', () => {
  it('should show or hide element', async () => {
    let handle: any
    mockOnElementIntersection.mockImplementationOnce((_, _handle) => {
      handle = _handle
    })

    const wrapper = mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })

    await flushPromises()

    expect(typeof handle).toBe('function')

    handle([
      {
        intersectionRatio: threshold + 0.01,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('foo')

    handle([
      {
        intersectionRatio: 0,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('')
  })
})
