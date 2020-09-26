import {boxSystem} from '@/ui/component/box/system'
import styled from '@/ui/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, ref, toRefs} from 'vue'
import {useAnimate} from '@/ui/hooks/useAnimate'

const BoxComponent = styled('div', {shouldForwardProp})(...boxSystem)

export const Box = defineComponent({
  name: 'box',
  props: ['mountAni', 'hoverAni', 'tapAni'],
  setup(props, {attrs, slots}) {
    const {mountAni, hoverAni, tapAni} = toRefs(props)
    const root = ref()
    useAnimate(root, {mountAni, hoverAni, tapAni})

    return () => {
      return (
        h(BoxComponent, {...attrs, ...props, ref: root}, slots)
      )
    }
  },
})
