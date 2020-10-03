import {boxSystem} from '../box/system'
import styled from '@/lib/emotion/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs} from 'vue'
import {useAnimate} from '@/ui/hooks/useAnimate'

const BoxComponent = styled('div', {shouldForwardProp})(...boxSystem)

export const Box = defineComponent({
  name: 'box',
  props: ['mountAni', 'hoverAni', 'tapAni'],
  emits: {
    tap: null,
    hover: null,
  },
  setup(props, {attrs, slots, emit}) {
    const {mountAni, hoverAni, tapAni} = toRefs(props)
    const root = ref()
    const onTap = (event) => emit('tap', event)
    const onHover = (event) => emit('hover', event)

    useAnimate(root, {mountAni, hoverAni, tapAni, onTap, onHover})

    return () => {
      return (
        h(BoxComponent, {...attrs, ...props, ref: root}, slots)
      )
    }
  },
})
