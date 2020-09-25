import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs, onMounted, computed} from 'vue'
import {boxSystem} from '@/ui/component/box/system'
import styled from '@/ui/styled'
import {keyframes, easing, styler} from 'popmotion'
import {castArray} from 'lodash'

const BoxComponent = styled('div', {shouldForwardProp})(...boxSystem)

interface Transition {
  duration?: number
  ease?: string
}

interface Animate {
  x?: number
  y?: number
  scale?: number
}

interface Props {
  transition: Transition
  animate: Animate[] | Animate | number
}

const defaultStyle = {
  scale: 1,
  x: 0,
  y: 0,
}

export const Box = defineComponent({
  name: 'box',
  props: ['transition', 'animate'],
  setup(props, {attrs, slots}) {
    const {transition, animate} = toRefs(props)
    const root = ref()

    const animateAction = computed(() => {
      if (!animate?.value) {
        return
      }

      const values: Array<Record<string, any>> = [defaultStyle]
      if (animate?.value) {
        values.push(...castArray(animate?.value))
      } else {
        values.push({})
      }

      return keyframes({
        duration: 500,
        ease: easing.easeInOut,
        ...transition?.value,
        values,
      })
    })

    onMounted(() => {
      if (animateAction.value) {
        const elStyler = styler(root.value.$el)
        animateAction.value.start(elStyler.set)
      }
    })

    return () => {
      return (
        h(BoxComponent, {...attrs, ...props, ref: root}, slots)
      )
    }
  },
})
