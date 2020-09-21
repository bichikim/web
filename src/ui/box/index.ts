import {defineComponent, h, ref, toRef} from 'vue'
import {boxSystem} from './system'
import styled from '@/lib/emotion/styled'
import shouldForwardProp from '@styled-system/should-forward-prop'

const BoxComponent = styled('div', {shouldForwardProp})(...boxSystem)

export const Box = defineComponent({
  setup(props, {attrs, slots}) {
    return () => {
      return (
        h(BoxComponent, {...attrs, ...props}, slots)
      )
    }
  },
})
