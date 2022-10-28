/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import {useElementIntersection} from '../'
import {onElementIntersection} from 'src/on-element-intersection'

jest.mock('src/on-element-intersection', () => {
  const actual = jest.requireActual('src/on-element-intersection')
  return {
    ...actual,
    onElementIntersection: jest.fn(actual.onElementIntersection),
  }
})

const _onElementIntersection = jest.mocked(onElementIntersection)

describe('use-element-intersection', () => {
  const setup = (threshold?: number) => {
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

    return {
      TestComponent,
    }
  }
  afterEach(() => {
    jest.resetAllMocks()
  })
  it('should show or hide element', async () => {
    const threshold = 0.05
    let handle: any
    _onElementIntersection.mockImplementationOnce(((_, _handle) => {
      handle = _handle
    }) as any)
    const {TestComponent} = setup(threshold)
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
  it('should run well without threshold', async () => {
    const threshold = 0.05
    let handle: any
    _onElementIntersection.mockImplementationOnce(((_, _handle) => {
      handle = _handle
    }) as any)

    const {TestComponent} = setup()
    const wrapper = mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })
    expect(wrapper.text()).toBe('')
    handle([
      {
        intersectionRatio: threshold + 0.01,
      },
    ])
    await flushPromises()
    expect(wrapper.text()).toBe('foo')
  })
})
