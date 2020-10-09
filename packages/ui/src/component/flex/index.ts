import {Box} from 'src/component/box'
import {responsiveType} from 'src/props'
import styled from 'src/styled'
import {slotToArray} from 'src/utils'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {defineComponent, h, toRefs} from 'vue'
import {flexItemSystem} from './flex-item-system'
import {systems} from './systems'

const props = {gap: responsiveType, range: responsiveType, show: responsiveType}
const FlexItem = styled('div', {props, shouldForwardProp})(...flexItemSystem)

const BoxForFlex = styled(Box, {passThrough: true, props})(...systems)

export const Flex = defineComponent({
  name: 'Flex',
  props: {
    rangeItems: responsiveType,
    column: responsiveType,
    division: responsiveType,
    reverse: responsiveType,
  },
  setup(props, {attrs, slots}) {
    const {division, column, rangeItems, reverse} = toRefs(props)
    return () => {
      const children = slotToArray(slots.default)
      return (
        h(BoxForFlex, {...attrs}, () => [
          h('div', {class: 'background'}),
          h('div', {class: 'container'},
            children.map((child) => {
              const childProps = child.props || {}
              const {range = rangeItems, basis, show = true, offset} = childProps
              return h(FlexItem, {
                basis,
                column,
                division,
                offset,
                range,
                reverse,
                show,
              }, () => child)
            }),
          ),
        ])
      )
    }
  },
})
