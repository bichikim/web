/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {defineComponent, h, onUnmounted, ref, toRef} from 'vue'

/**
 * vue 는 unmount 후에 비동기가 실행되도 안전 한 것에 대한 증명 테스트
 * ref 와 component 사이에 트리거 구독 지가 있고 unmount 되면 구독지에서 컴포넌트가 해지 되기 때문에 ref 와 연결은 분리된다 그럼으로 비동기 테스트 전에
 * unmount 되는 것에 두려워 할 필요가 업다 (다만 네트워크 기다림을 오래되어 ref 가 살아 있는시간이 (위크 맵 또는 셋에 연결되어 있다) 오래 되지 않게 하기위해
 * unmount 될때 비동기를 cancel 하거나 비동기 최대 기다리는 시간을 설정하면 좋다
 */
describe('async safe', () => {
  it('should work with async function after unmount case', async () => {
    let _resolve: any
    let unMounted: boolean = false
    const fetch = () => {
      return new Promise((resolve) => {
        _resolve = resolve
      })
    }
    const component = defineComponent({
      setup() {
        const result = ref()

        onUnmounted(() => {
          unMounted = true
        })

        fetch().then((value) => {
          result.value = value
        })

        return () => h('div', {}, result.value)
      },
    })
    const root = defineComponent({
      props: {
        show: {type: Boolean},
      },
      setup(props, {slots}) {
        const show = toRef(props, 'show')

        return () => {
          if (show.value) {
            return h(component, {}, slots.default?.())
          }

          return null
        }
      },
    })
    const wrapper = mount(root, {
      props: {
        show: true,
      },
    })

    expect(wrapper.get('div').text()).toBe('')

    expect(typeof _resolve).toBe('function')

    await wrapper.setProps({
      show: false,
    })

    expect(unMounted).toBe(true)
    expect(wrapper.html()).toMatchInlineSnapshot('""')

    _resolve?.('foo')

    await flushPromises()
  })
})
