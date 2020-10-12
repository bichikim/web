import {boxSystem} from 'src/component/box/system'
import styled from 'src/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs} from 'vue'
import {animate, kickSystem} from 'src/hooks'

const BoxStyle = styled('div', {shouldForwardProp, name: 'box-style'})(...boxSystem)

export const Box = defineComponent({
  name: 'box',
  props: ['mountAni', 'hoverAni', 'tapAni', 'as', 'kickSys'],
  emits: {
    tap: null,
    hover: null,
  },
  setup(props, {attrs, slots, emit}) {
    const {mountAni, hoverAni, tapAni, kickSys} = toRefs(props)
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

    const newProps = kickSystem({...attrs, ...props}, kickSys?.value)

    return () => {
      return (
        h(BoxStyle, {...newProps.value, ref: root}, slots)
      )
    }
  },
})
