import {boxSystem} from 'src/component/box/system'
import styled from 'src/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs} from 'vue'
import {animate} from 'src/hooks'
import {allProps} from 'src/props'

const BoxStyle = styled('div', {shouldForwardProp, name: 'box-style'})(...boxSystem)

export const Box = defineComponent({
  name: 'box',
  props: {
    ...allProps,
    mountAni: null,
    hoverAni: null,
    tapAni: null,
  },
  emits: {
    tap: null,
    hover: null,
  },
  setup(props, {attrs, slots, emit}) {
    const {mountAni, hoverAni, tapAni} = toRefs(props)
    const root = ref(null)
    const onTap = (event) => emit('tap', event)
    const onHover = (event) => emit('hover', event)

    animate(root, {
      mountAni: mountAni?.value,
      hoverAni: hoverAni?.value,
      tapAni: tapAni?.value,
      onTap,
      onHover,
    })

    return () => {
      return (
        h(BoxStyle, {...attrs, ...props, ref: root}, slots)
      )
    }
  },
})
