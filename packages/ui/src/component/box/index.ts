import {boxSystem} from 'packages/ui/component/box/system'
import styled from 'packages/ui/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs} from 'vue'
import {useAnimate} from 'packages/ui/hooks'

const BoxStyle = styled('div', {shouldForwardProp, name: 'box-style'})(...boxSystem)

export const Box = defineComponent({
  name: 'box',
  props: ['mountAni', 'hoverAni', 'tapAni', 'as'],
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
        h(BoxStyle, {...attrs, ...props, ref: root}, slots)
      )
    }
  },
})
