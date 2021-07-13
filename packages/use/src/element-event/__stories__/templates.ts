import {h, ref} from 'vue-demi'
import {useElementEvent} from '../'

export const Default = () => ({
  setup() {
    const resizeCountRef = ref(0)
    const clickCountRef = ref(0)

    // 예를 위해 이렇게 쓰지만 onClick 을 하는 것을 추천합니다.
    const elementRef = ref()

    const resize = useElementEvent(window, 'resize', () => {
      resizeCountRef.value += 1
    })

    const click = useElementEvent(elementRef, 'click', () => {
      clickCountRef.value += 1
    })

    const toggleResize = () => {
      resize.value = !resize.value
    }

    const toggleClick = () => {
      click.value = !click.value
    }

    return () => (
      h('div', [
        h('div', {ref: elementRef}, 'click me'),
        h('div', {}, `resize ${resizeCountRef.value}`),
        h('div', {}, `click ${clickCountRef.value}`),
        h('div', {}, `resize active ${resize.value}`),
        h('div', {}, `click active ${click.value}`),
        h('button', {onclick: toggleResize}, 'toggle resize'),
        h('button', {onclick: toggleClick}, 'toggle click'),
      ])
    )
  },
})
